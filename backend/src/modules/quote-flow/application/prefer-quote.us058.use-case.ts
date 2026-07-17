// PreferQuoteUs058UseCase (US-058 / BE-003). Tech Spec §7 UseCase. AC-01..AC-04 + EC-01..EC-03.
//
// Toggle idempotente y transaccional de `Quote.is_preferred` por el organizer dueño del evento.
// Dentro de un único `prisma.$transaction`:
//   1. `SELECT ... FOR UPDATE` sobre la Quote target — bloquea la fila durante la transacción.
//   2. Verifica ownership del evento vía `quote_requests → events`. 404 uniforme si no lo es (D7).
//   3. Guard de estado (VR-03): `status='sent'` y no vencida (`valid_until IS NULL OR valid_until
//      >= clock.now()`). Otros ⇒ `409 QUOTE_NOT_PREFERABLE` con `details.current_status`.
//      Nota (DEV-02 del execution record): el enum `QuoteStatus` no contiene `responded` (ese
//      status pertenece al `QuoteRequest`), así que la lista efectiva es sólo `{sent}`.
//   4. Idempotencia (AC-04): si `is_preferred === body.is_preferred` no hay side-effects.
//   5. Cuando `body.is_preferred === true`:
//      - Busca la Quote actualmente preferred en el mismo `(event_id, service_category_id)` con
//        `SELECT ... FOR UPDATE` (guard contra race entre 2 PATCH simultáneos — un lock cruzado
//        se serializa; el UNIQUE parcial nativo actúa como último tapón).
//      - Si existe, UPDATE `is_preferred=false` y captura `previous.vendor_profile_id` para la
//        notificación `quote.unmarked_preferred` al vendor previo.
//   6. UPDATE de la Quote target con el nuevo `is_preferred`.
//   7. Fan-out atómico vía `QuoteEventNotificationService.emit({ tx })`:
//      - Vendor target: 2 notifs `quote.marked_preferred` o `quote.unmarked_preferred` según
//        el toggle.
//      - Vendor previo (sólo en caso de cambio de preferred): 2 notifs `quote.unmarked_preferred`.
//   8. Emite log `quote.preferred.toggled` con `{previousValue, newValue, unmarkedQuoteId?}`.
//
// Errores (§7):
//   - `QuoteNotFoundError → 404 QUOTE_NOT_FOUND` (uniforme, sin filtrar existencia ni ownership).
//   - `QuoteNotPreferableError → 409 QUOTE_NOT_PREFERABLE` con `details.current_status`.
//
// Atomicidad (D2): un fallo en cualquier INSERT/UPDATE revierte todo el toggle. La UNIQUE partial
// `(event_id, service_category_id) WHERE is_preferred=true` actúa como constraint DB de último
// recurso; el `SELECT FOR UPDATE` en el paso 5 evita que 2 PATCH simultáneos abran una ventana.
import { Prisma, type PrismaClient, QuoteStatus } from '@prisma/client';
import type { QuoteView } from '../domain/quote.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type {
  QuoteEventName,
  QuoteEventNotificationService,
} from '../services/quote-event-notification.service.js';
import { QuoteNotFoundError } from '../domain/us054.errors.js';
import { QuoteNotPreferableError } from '../domain/us058.errors.js';
import type { PreferQuoteBody } from '../dto/prefer-quote.us058.request.js';
import type { QuoteBreakdownItem } from '../domain/quote.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';

interface QuoteLockRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  event_id: string;
  service_category_id: string;
  status: QuoteStatus;
  valid_until: Date | null;
  is_preferred: boolean;
}

interface PreviousPreferredRow {
  id: string;
  vendor_profile_id: string;
}

interface EventOwnerRow {
  organizer_user_id: string;
}

interface VendorUserRow {
  user_id: string;
}

export interface PreferQuoteCtx {
  correlationId?: string;
}

export class PreferQuoteUs058UseCase {
  constructor(
    private readonly quoteEvents: QuoteEventNotificationService,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    quoteId: string,
    body: PreferQuoteBody,
    ctx: PreferQuoteCtx = {},
  ): Promise<QuoteView> {
    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      // 1) SELECT FOR UPDATE de la Quote target.
      const quoteRows = await tx.$queryRaw<QuoteLockRow[]>(
        Prisma.sql`SELECT id, quote_request_id, vendor_profile_id, event_id, service_category_id,
                          status, valid_until, is_preferred
                     FROM quotes
                    WHERE id = ${quoteId}::uuid
                    FOR UPDATE`,
      );
      const quote = quoteRows[0];
      if (!quote) throw new QuoteNotFoundError();

      // 2) Ownership del evento (via QuoteRequest → Event) — 404 uniforme si el organizer no es dueño.
      const eventRows = await tx.$queryRaw<EventOwnerRow[]>(
        Prisma.sql`SELECT user_id AS organizer_user_id FROM events WHERE id = ${quote.event_id}::uuid`,
      );
      const event = eventRows[0];
      if (!event || event.organizer_user_id !== currentUserId) {
        throw new QuoteNotFoundError();
      }

      // 3) Guard de estado + expiración lazy.
      if (quote.status !== QuoteStatus.sent) {
        throw new QuoteNotPreferableError(quote.status);
      }
      if (quote.valid_until && quote.valid_until.getTime() < now.getTime()) {
        throw new QuoteNotPreferableError('expired');
      }

      // 4) Idempotencia (AC-04): mismo valor ⇒ no-op, sin notifs.
      if (quote.is_preferred === body.is_preferred) {
        const untouched = await tx.quote.findUniqueOrThrow({ where: { id: quoteId } });
        return toQuoteView(untouched);
      }

      // 5) Cuando se marca `true`, limpia la Quote previamente preferred en el mismo
      //    `(event, category)` si existe. Toma el lock sobre la fila para serializar contra
      //    otros PATCH concurrentes que apuntaran a la misma pareja.
      let unmarkedVendorUserId: string | null = null;
      let unmarkedQuoteId: string | null = null;
      if (body.is_preferred === true) {
        const previousRows = await tx.$queryRaw<PreviousPreferredRow[]>(
          Prisma.sql`SELECT id, vendor_profile_id
                       FROM quotes
                      WHERE event_id = ${quote.event_id}::uuid
                        AND service_category_id = ${quote.service_category_id}::uuid
                        AND is_preferred = true
                        AND id <> ${quoteId}::uuid
                      FOR UPDATE`,
        );
        const previous = previousRows[0];
        if (previous) {
          await tx.quote.update({
            where: { id: previous.id },
            data: { isPreferred: false },
          });
          const previousVendorRows = await tx.$queryRaw<VendorUserRow[]>(
            Prisma.sql`SELECT user_id FROM vendor_profiles WHERE id = ${previous.vendor_profile_id}::uuid`,
          );
          const previousVendor = previousVendorRows[0];
          if (!previousVendor) throw new QuoteNotFoundError();
          unmarkedVendorUserId = previousVendor.user_id;
          unmarkedQuoteId = previous.id;
        }
      }

      // 6) UPDATE de la Quote target.
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: { isPreferred: body.is_preferred },
      });

      // 7) Fan-out atómico de notificaciones.
      const targetVendorRows = await tx.$queryRaw<VendorUserRow[]>(
        Prisma.sql`SELECT user_id FROM vendor_profiles WHERE id = ${quote.vendor_profile_id}::uuid`,
      );
      const targetVendor = targetVendorRows[0];
      if (!targetVendor) throw new QuoteNotFoundError();

      const targetEventName: QuoteEventName = body.is_preferred
        ? 'quote.marked_preferred'
        : 'quote.unmarked_preferred';
      const basePayload = {
        quote_id: quoteId,
        quote_request_id: quote.quote_request_id,
        event_id: quote.event_id,
        service_category_id: quote.service_category_id,
      };

      await this.quoteEvents.emit({
        quoteId,
        recipientUserId: targetVendor.user_id,
        eventName: targetEventName,
        payload: basePayload,
        tx,
        correlationId: ctx.correlationId,
      });

      if (unmarkedVendorUserId && unmarkedQuoteId) {
        await this.quoteEvents.emit({
          quoteId: unmarkedQuoteId,
          recipientUserId: unmarkedVendorUserId,
          eventName: 'quote.unmarked_preferred',
          payload: {
            ...basePayload,
            quote_id: unmarkedQuoteId,
            unmarked_by_quote_id: quoteId,
          },
          tx,
          correlationId: ctx.correlationId,
        });
      }

      // 8) Log del toggle con metadatos seguros (previousValue, newValue, unmarkedQuoteId).
      this.logger.emit('quote.preferred.toggled', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        quoteId,
        quoteRequestId: quote.quote_request_id,
        previousValue: quote.is_preferred,
        newValue: body.is_preferred,
        unmarkedQuoteId: unmarkedQuoteId ?? undefined,
      });

      return toQuoteView(updated);
    });
  }
}

function toQuoteView(q: {
  id: string;
  quoteRequestId: string;
  vendorProfileId: string;
  amount: Prisma.Decimal;
  currency: string;
  breakdown: Prisma.JsonValue | null;
  conditions: string | null;
  validUntil: Date | null;
  status: QuoteStatus;
  isPreferred: boolean;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): QuoteView {
  return {
    id: q.id,
    quoteRequestId: q.quoteRequestId,
    vendorProfileId: q.vendorProfileId,
    totalPrice: q.amount.toString(),
    currencyCode: q.currency as SupportedCurrency,
    breakdown: (q.breakdown as QuoteBreakdownItem[] | null) ?? null,
    conditions: q.conditions ?? null,
    validUntil: q.validUntil ? q.validUntil.toISOString() : null,
    status: q.status,
    isPreferred: q.isPreferred,
    sentAt: q.sentAt ? q.sentAt.toISOString() : null,
    acceptedAt: q.acceptedAt ? q.acceptedAt.toISOString() : null,
    rejectedAt: q.rejectedAt ? q.rejectedAt.toISOString() : null,
    rejectionReason: q.rejectionReason,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}
