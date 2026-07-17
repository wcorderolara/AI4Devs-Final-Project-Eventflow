// CreateBookingIntentUs060UseCase (US-060 / BE-003). Tech Spec §7 UseCase. AC-01..AC-03 + EC-01..EC-05.
//
// Endpoint atómico `POST /api/v1/booking-intents` (D1) que fusiona la aceptación de la Quote y
// la creación del BookingIntent `pending` en un único `prisma.$transaction`:
//
//   1. `SELECT ... FOR UPDATE` sobre la Quote target — bloquea la fila durante la transacción y
//      cierra la ventana de 2 POST simultáneos que apuntaran a la misma Quote (EC-03, VR-07).
//   2. Ownership del evento vía `quote_requests → events` — `404 QUOTE_NOT_FOUND` uniforme
//      (D7, SEC-03) si el organizer no es dueño. No filtra existencia ni ownership.
//   3. Guard de estado (VR-05): Quote.status='sent' — otros ⇒ `409 QUOTE_NOT_ACCEPTABLE` con
//      `details.current_status`. Nota (DEV-02 del execution record): el enum `QuoteStatus` no
//      incluye `responded`; la lista efectiva es sólo `{sent}` (una Quote `is_preferred=true`
//      sigue siendo `status='sent'`).
//   4. Guard de expiración (VR-06): `valid_until >= clock.now()` — vencida ⇒
//      `409 QUOTE_EXPIRED` con `details.valid_until`.
//   5. Guard de UNIQUE parcial (VR-07): busca BookingIntent activo (`pending`/`confirmed_intent`)
//      para la Quote con `SELECT ... FOR UPDATE`. Existe ⇒ `409 BOOKING_INTENT_ALREADY_EXISTS`
//      con `details.booking_intent_id`. El UNIQUE parcial nativo
//      `uq_booking_intents_active_per_quote` actúa como constraint DB de último recurso; el
//      `SELECT FOR UPDATE` en este paso evita la ventana ante 2 POST concurrentes.
//   6. UPDATE `quotes` — `status='accepted', accepted_at=NOW()`.
//   7. INSERT `booking_intents` — `status='pending', created_by=currentUserId`.
//   8. Fan-out atómico vía `BookingEventNotifierPort.emit({ tx })` al vendor con
//      `event='booking_intent.created'` — 2 Notifications (in_app + email_simulated) que
//      participan en la misma transacción (D5, D9). Un fallo en la emisión revierte todo el
//      cambio (guard contra Quote `accepted` sin BookingIntent).
//   9. Log `booking_intent.created` con `{bookingIntentId, quoteId, organizerUserId,
//      correlationId}` — SEC-09 no expone el payload de la notificación.
//
// Errores mapeados por el `errorHandlerMiddleware`:
//   - `QuoteNotFoundForBookingError → 404 QUOTE_NOT_FOUND` (uniforme).
//   - `DisclaimerRequiredError → 400 DISCLAIMER_REQUIRED` (`details.field='disclaimer_accepted'`).
//   - `QuoteNotAcceptableError → 409 QUOTE_NOT_ACCEPTABLE` (`details.current_status`).
//   - `QuoteExpiredError → 409 QUOTE_EXPIRED` (`details.valid_until`).
//   - `BookingIntentAlreadyExistsError → 409 BOOKING_INTENT_ALREADY_EXISTS`
//     (`details.booking_intent_id`).
//
// Atomicidad (D3): un fallo en cualquiera de los pasos 6–8 revierte la aceptación de la Quote y
// la creación del intent — la Quote se conserva en su estado previo. Guard defensivo contra
// carreras: la UNIQUE partial DB (`uq_booking_intents_active_per_quote`) sirve como último
// tapón — si dos SELECTs FOR UPDATE competidores llegaran a materializar sus INSERTs, Postgres
// dispara `P2002` y el catcher del use case lo re-tipa como `BookingIntentAlreadyExistsError`.
import {
  Prisma,
  type PrismaClient,
  QuoteStatus,
  BookingIntentStatus,
} from '@prisma/client';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { BookingEventNotifierPort } from '../ports/quote-event-notifier.port.js';
import { QuoteNotFoundForBookingError } from '../domain/us060.errors.js';
import { QuoteExpiredError } from '../../../shared/domain/errors/quote-flow.errors.js';
import {
  BookingIntentAlreadyExistsError,
  DisclaimerRequiredError,
  QuoteNotAcceptableError,
} from '../domain/us060.errors.js';
import type { CreateBookingIntentUs060Body } from '../dto/create-booking-intent.request.js';
import type { BookingIntentView } from '../domain/booking-intent.js';

interface QuoteLockRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  event_id: string;
  service_category_id: string;
  status: QuoteStatus;
  valid_until: Date | null;
}

interface ActiveIntentRow {
  id: string;
  status: BookingIntentStatus;
}

interface EventOwnerRow {
  organizer_user_id: string;
}

interface VendorUserRow {
  user_id: string;
}

export interface CreateBookingIntentCtx {
  correlationId?: string;
}

export class CreateBookingIntentUs060UseCase {
  constructor(
    private readonly quoteEvents: BookingEventNotifierPort,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    body: CreateBookingIntentUs060Body,
    ctx: CreateBookingIntentCtx = {},
  ): Promise<BookingIntentView> {
    // Disclaimer server-side enforcement (D2, FR-BOOKING-006). El DTO acepta `boolean` para
    // permitir distinguir `false` de "no es booleano" — el `.strict()` ya bloquea claves extra.
    if (body.disclaimer_accepted !== true) {
      throw new DisclaimerRequiredError();
    }

    const now = this.clock.now();

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1) SELECT FOR UPDATE de la Quote target.
        const quoteRows = await tx.$queryRaw<QuoteLockRow[]>(
          Prisma.sql`SELECT id, quote_request_id, vendor_profile_id, event_id, service_category_id,
                            status, valid_until
                       FROM quotes
                      WHERE id = ${body.quote_id}::uuid
                      FOR UPDATE`,
        );
        const quote = quoteRows[0];
        if (!quote) throw new QuoteNotFoundForBookingError();

        // 2) Ownership del evento — 404 uniforme.
        const eventRows = await tx.$queryRaw<EventOwnerRow[]>(
          Prisma.sql`SELECT user_id AS organizer_user_id
                       FROM events
                      WHERE id = ${quote.event_id}::uuid`,
        );
        const event = eventRows[0];
        if (!event || event.organizer_user_id !== currentUserId) {
          throw new QuoteNotFoundForBookingError();
        }

        // 3) Guard de estado (VR-05, EC-02).
        if (quote.status !== QuoteStatus.sent) {
          throw new QuoteNotAcceptableError(quote.status);
        }

        // 4) Guard de expiración (VR-06, EC-01).
        if (quote.valid_until && quote.valid_until.getTime() < now.getTime()) {
          throw new QuoteExpiredError();
        }

        // 5) Guard UNIQUE parcial vía SELECT FOR UPDATE — bloquea la fila si existe un
        //    intent activo, cerrando la ventana entre 2 POST simultáneos.
        const activeRows = await tx.$queryRaw<ActiveIntentRow[]>(
          Prisma.sql`SELECT id, status
                       FROM booking_intents
                      WHERE quote_id = ${body.quote_id}::uuid
                        AND status IN ('pending', 'confirmed_intent')
                      FOR UPDATE`,
        );
        const active = activeRows[0];
        if (active) {
          throw new BookingIntentAlreadyExistsError(active.id);
        }

        // 6) UPDATE Quote → accepted.
        await tx.quote.update({
          where: { id: body.quote_id },
          data: { status: QuoteStatus.accepted, acceptedAt: now },
        });

        // 7) INSERT BookingIntent → pending.
        const intent = await tx.bookingIntent.create({
          data: {
            quoteId: body.quote_id,
            eventId: quote.event_id,
            serviceCategoryId: quote.service_category_id,
            vendorProfileId: quote.vendor_profile_id,
            createdBy: currentUserId,
            status: BookingIntentStatus.pending,
            isSimulated: true,
          },
        });

        // 8) Fan-out atómico de notificaciones al vendor.
        const vendorRows = await tx.$queryRaw<VendorUserRow[]>(
          Prisma.sql`SELECT user_id
                       FROM vendor_profiles
                      WHERE id = ${quote.vendor_profile_id}::uuid`,
        );
        const vendor = vendorRows[0];
        if (!vendor) {
          // Defensa: si el vendor_profile fue soft-deleted entre pasos, revertimos con 404
          // uniforme — evita persistir un intent sin destinatario para la notificación.
          throw new QuoteNotFoundForBookingError();
        }

        await this.quoteEvents.emit({
          recipientUserId: vendor.user_id,
          eventName: 'booking_intent.created',
          payload: {
            booking_intent_id: intent.id,
            quote_id: body.quote_id,
            quote_request_id: quote.quote_request_id,
            event_id: quote.event_id,
            service_category_id: quote.service_category_id,
          },
          tx,
          quoteId: body.quote_id,
          correlationId: ctx.correlationId,
        });

        // 9) Log del evento de dominio.
        this.logger.emit('booking_intent.created', {
          correlationId: ctx.correlationId,
          actorId: currentUserId,
          bookingIntentId: intent.id,
          quoteId: body.quote_id,
          quoteRequestId: quote.quote_request_id,
        });

        return toBookingIntentView(intent);
      });
    } catch (err) {
      // Último tapón — race window residual entre el SELECT FOR UPDATE del paso 5 y el INSERT
      // del paso 7 en presencia de una transacción competidora que hubiera consumado su INSERT
      // en el mismo tick: Postgres dispara `P2002` sobre `uq_booking_intents_active_per_quote`.
      // Se re-lanza como `BookingIntentAlreadyExistsError` para preservar el contrato §7.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && matchesActiveQuoteUnique(err)) {
        const existing = await this.prisma.bookingIntent.findFirst({
          where: { quoteId: body.quote_id, status: { in: ['pending', 'confirmed_intent'] } },
          select: { id: true },
        });
        throw new BookingIntentAlreadyExistsError(existing?.id ?? 'unknown');
      }
      throw err;
    }
  }
}

function matchesActiveQuoteUnique(err: Prisma.PrismaClientKnownRequestError): boolean {
  const target = err.meta?.target;
  if (Array.isArray(target)) return target.some((t) => typeof t === 'string' && t.includes('uq_booking_intents_active_per_quote'));
  if (typeof target === 'string') return target.includes('uq_booking_intents_active_per_quote');
  return false;
}

function toBookingIntentView(b: {
  id: string;
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: BookingIntentStatus;
  isSimulated: boolean;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BookingIntentView {
  return {
    id: b.id,
    quoteId: b.quoteId,
    eventId: b.eventId,
    serviceCategoryId: b.serviceCategoryId,
    vendorProfileId: b.vendorProfileId ?? null,
    status: b.status,
    isSimulated: b.isSimulated,
    confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
    cancelledBy: b.cancelledBy ?? null,
    cancellationReason: b.cancellationReason ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
