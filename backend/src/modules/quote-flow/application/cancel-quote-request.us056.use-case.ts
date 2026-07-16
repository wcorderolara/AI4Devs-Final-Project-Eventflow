// CancelQuoteRequestUs056UseCase (US-056 / BE-004). Tech Spec §7 UseCase.
// AC-01/02/03, EC-01..EC-06, AUTH-TS-01..05.
//
// Cancelación transaccional de un `QuoteRequest` por el organizer dueño del evento. Dentro de
// un único `prisma.$transaction`:
//   1. `SELECT ... FOR UPDATE` de la fila `quote_requests` (guard contra 2 POST cancel simultáneos).
//   2. Verifica ownership del evento (colapsa a 404 uniforme si el organizer no es dueño — D7/SEC-03).
//   3. Verifica `status ∈ ACTIVE_STATES` (`sent`, `viewed`, `responded`) — 409 QR_NOT_CANCELLABLE si no.
//      Nota (DEV-01): el enum Prisma no contiene `preferred`; ese literal del User Story es
//      semántico y se refleja vía `Quote.isPreferred` (atributo del Quote, no del QR).
//   4. EXISTS check `BookingIntent.confirmed_intent` asociado vía la Quote — 409
//      QR_HAS_CONFIRMED_BOOKING con `details.booking_intent_id` (D2, EC-01, VR-05).
//   5. UPDATE `status='cancelled' + cancelled_at + cancelled_by + cancellation_reason?` con guard
//      defensivo `WHERE status IN (...)` (blindaje contra tx aisladas + idempotencia EC-06).
//   6. Invoca `QuoteEventNotificationService.emit({ eventName: 'quote_request.cancelled', tx })`
//      que persiste 2 Notifications atómicamente (D5).
//   7. Emite log `quote_request.cancelled` con metadatos seguros (BE-006).
//
// Idempotencia (EC-06): un re-cancel entra al paso 3 con `status='cancelled'` y retorna 409 sin
// crear Notifications adicionales. Atomicidad (D8): un fallo en cualquier INSERT revierte el
// UPDATE del QR — el próximo intento vuelve a partir del estado activo previo.
//
// La Quote asociada (si existe) NO se modifica (D3, AC-03).
//
// El body opcional `{ reason }` se valida aquí para emitir `INVALID_CANCELLATION_REASON` (EC-04/VR-02)
// en lugar del genérico `VALIDATION_ERROR` que emitiría un `.max(500)` en el DTO Zod.
import { Prisma, type PrismaClient, QuoteRequestStatus } from '@prisma/client';
import type { QuoteRequestView, QuoteRequestBrief } from '../domain/quote-request.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import type { QuoteEventNotificationService } from '../services/quote-event-notification.service.js';
import {
  QrNotFoundError,
  QrNotCancellableError,
  QrHasConfirmedBookingError,
  InvalidCancellationReasonError,
} from '../domain/us056.errors.js';
import {
  CANCELLATION_REASON_MAX_LENGTH,
  type CancelQuoteRequestBody,
} from '../dto/cancel-quote-request.us056.request.js';

/** Estados origen permitidos para cancelar (D1, VR-04, EC-02). */
const ACTIVE_QR_STATUSES: readonly QuoteRequestStatus[] = [
  QuoteRequestStatus.sent,
  QuoteRequestStatus.viewed,
  QuoteRequestStatus.responded,
];

interface QuoteRequestLockRow {
  id: string;
  event_id: string;
  vendor_profile_id: string | null;
  status: QuoteRequestStatus;
}

interface EventOwnerRow {
  organizer_user_id: string;
}

interface VendorUserRow {
  user_id: string;
}

interface ConfirmedBookingRow {
  id: string;
}

export interface CancelQuoteRequestCtx {
  correlationId?: string;
}

export class CancelQuoteRequestUs056UseCase {
  constructor(
    private readonly quoteEvents: QuoteEventNotificationService,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    quoteRequestId: string,
    body: CancelQuoteRequestBody,
    ctx: CancelQuoteRequestCtx = {},
  ): Promise<QuoteRequestView> {
    // Valida longitud del reason antes de abrir la transacción — evita tomar el lock si el
    // input es inválido. Un string vacío (`''`) se acepta y se persiste como `null` (D4).
    const reason =
      body.reason !== undefined && body.reason.length > 0 ? body.reason : null;
    if (reason !== null && reason.length > CANCELLATION_REASON_MAX_LENGTH) {
      throw new InvalidCancellationReasonError();
    }

    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      // 1) SELECT FOR UPDATE de la QR — bloquea la fila durante el resto de la transacción.
      const qrRows = await tx.$queryRaw<QuoteRequestLockRow[]>(
        Prisma.sql`SELECT id, event_id, vendor_profile_id, status
                     FROM quote_requests
                    WHERE id = ${quoteRequestId}::uuid
                    FOR UPDATE`,
      );
      const qr = qrRows[0];
      if (!qr) throw new QrNotFoundError();

      // 2) Ownership del evento — 404 uniforme si el organizer no es dueño (D7/SEC-03).
      const eventRows = await tx.$queryRaw<EventOwnerRow[]>(
        Prisma.sql`SELECT user_id AS organizer_user_id FROM events WHERE id = ${qr.event_id}::uuid`,
      );
      const event = eventRows[0];
      if (!event || event.organizer_user_id !== currentUserId) {
        throw new QrNotFoundError();
      }

      // 3) Guard de estado (EC-02/EC-06, VR-04).
      if (!ACTIVE_QR_STATUSES.includes(qr.status)) {
        throw new QrNotCancellableError(qr.status);
      }

      // 4) EXISTS check confirmed_intent (D2, EC-01, VR-05). El índice compuesto
      // `idx_booking_intents_quote_id_status` (DB-001) hace el EXISTS eficiente.
      const confirmedIntent = await tx.$queryRaw<ConfirmedBookingRow[]>(
        Prisma.sql`SELECT bi.id
                     FROM booking_intents bi
                     JOIN quotes q ON bi.quote_id = q.id
                    WHERE q.quote_request_id = ${quoteRequestId}::uuid
                      AND bi.status = 'confirmed_intent'
                    LIMIT 1`,
      );
      const firstConfirmed = confirmedIntent[0];
      if (firstConfirmed) {
        throw new QrHasConfirmedBookingError(firstConfirmed.id);
      }

      // 5) UPDATE con guard defensivo `status IN ACTIVE` (blindaje + idempotencia EC-06).
      const updateResult = await tx.quoteRequest.updateMany({
        where: { id: quoteRequestId, status: { in: [...ACTIVE_QR_STATUSES] } },
        data: {
          status: QuoteRequestStatus.cancelled,
          cancelledAt: now,
          cancelledBy: currentUserId,
          cancellationReason: reason,
        },
      });
      if (updateResult.count === 0) {
        // El guard atrapó una carrera contra otro tx que ya movió el status.
        throw new QrNotCancellableError(qr.status);
      }

      // 6) Fan-out de notificaciones al vendor destinatario. Si el QR no tiene vendor
      // asignado (`vendor_profile_id IS NULL`, permitido por US-102) no se emite notif —
      // no hay destinatario que resolver; se conserva el cancel y el log operativo.
      if (qr.vendor_profile_id) {
        const vendorRows = await tx.$queryRaw<VendorUserRow[]>(
          Prisma.sql`SELECT user_id FROM vendor_profiles WHERE id = ${qr.vendor_profile_id}::uuid`,
        );
        const vendor = vendorRows[0];
        if (vendor) {
          await this.quoteEvents.emit({
            recipientUserId: vendor.user_id,
            eventName: 'quote_request.cancelled',
            payload: {
              quote_request_id: quoteRequestId,
              event_id: qr.event_id,
              cancellation_reason: reason,
            },
            tx,
            correlationId: ctx.correlationId,
          });
        }
      }

      // 7) Log estructurado (BE-006).
      this.logger.emit('quote_request.cancelled', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        quoteRequestId,
      });

      // Re-leer la fila post-UPDATE con el shape completo del view (createdAt, brief, etc.).
      const updated = await tx.quoteRequest.findUniqueOrThrow({ where: { id: quoteRequestId } });
      return {
        id: updated.id,
        eventId: updated.eventId,
        serviceCategoryId: updated.serviceCategoryId,
        vendorProfileId: updated.vendorProfileId ?? null,
        status: updated.status,
        brief: (updated.brief as QuoteRequestBrief | null) ?? null,
        aiRecommendationId: updated.aiRecommendationId ?? null,
        viewedAt: updated.viewedAt ? updated.viewedAt.toISOString() : null,
        viewedBy: updated.viewedBy ?? null,
        cancelledAt: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
        cancelledBy: updated.cancelledBy ?? null,
        cancellationReason: updated.cancellationReason ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }
}
