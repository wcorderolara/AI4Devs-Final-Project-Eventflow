// RejectQuoteUs054UseCase (US-054 / BE-003). Tech Spec §7 UseCase. AC-01/AC-03, EC-01..EC-05.
//
// Rechazo transaccional del Quote por el organizer dueño del evento. Dentro de un único
// `prisma.$transaction`:
//   1. `SELECT ... FOR UPDATE` de la fila `quotes` (guard contra race entre 2 POST simultáneos).
//   2. Verifica ownership del evento (colapsa a 404 uniforme si el organizer no es dueño — D8/SEC-03).
//   3. Verifica que `status = 'sent'` (409 QUOTE_NOT_REJECTABLE si no — EC-01/EC-05).
//   4. UPDATE `status='rejected' + rejected_at + rejection_reason?`.
//   5. Invoca `QuoteEventNotificationService.emit({ eventName: 'quote.rejected', tx })`
//      (US-056 refactor) que persiste 2 Notifications atómicamente.
//   6. Emite log `quote.rejected` con metadatos seguros.
//
// Idempotencia (EC-05): un re-rechazo entra al paso 3 con `status='rejected'` y retorna 409 sin
// crear Notifications adicionales. Atomicidad (D7): un fallo en cualquier INSERT revierte el
// UPDATE de la Quote — el próximo intento vuelve a partir de `sent`.
//
// El body opcional `{ reason }` se valida aquí para emitir `INVALID_REJECTION_REASON` (EC-03/VR-02)
// en lugar del genérico `VALIDATION_ERROR` que emitiría un `.max(500)` en el DTO Zod.
import { Prisma, type PrismaClient, QuoteStatus } from '@prisma/client';
import type { QuoteView } from '../domain/quote.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
// US-056 (BE-002/003): refactor a service común genérico. `emit({ recipientUserId, eventName, ... })`.
import type { QuoteEventNotificationService } from '../services/quote-event-notification.service.js';
import {
  QuoteNotFoundError,
  QuoteNotRejectableError,
  InvalidRejectionReasonError,
} from '../domain/us054.errors.js';
import { REJECTION_REASON_MAX_LENGTH, type RejectQuoteBody } from '../dto/reject-quote.us054.request.js';
import type { QuoteBreakdownItem } from '../domain/quote.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';

interface QuoteLockRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  status: QuoteStatus;
}

interface EventOwnerRow {
  organizer_user_id: string;
}

interface VendorUserRow {
  user_id: string;
}

export interface RejectQuoteCtx {
  correlationId?: string;
}

export class RejectQuoteUs054UseCase {
  constructor(
    private readonly quoteEvents: QuoteEventNotificationService,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    quoteId: string,
    body: RejectQuoteBody,
    ctx: RejectQuoteCtx = {},
  ): Promise<QuoteView> {
    // Valida longitud del reason antes de abrir la transacción — evita tomar el lock si el
    // input es inválido. Un string vacío (`''`) se acepta y se persiste como `null` (D4).
    const reason =
      body.reason !== undefined && body.reason.length > 0 ? body.reason : null;
    if (reason !== null && reason.length > REJECTION_REASON_MAX_LENGTH) {
      throw new InvalidRejectionReasonError();
    }

    const now = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      // 1) SELECT FOR UPDATE de la Quote — bloquea la fila durante el resto de la transacción.
      const quoteRows = await tx.$queryRaw<QuoteLockRow[]>(
        Prisma.sql`SELECT id, quote_request_id, vendor_profile_id, status
                     FROM quotes
                    WHERE id = ${quoteId}::uuid
                    FOR UPDATE`,
      );
      const quote = quoteRows[0];
      if (!quote) throw new QuoteNotFoundError();

      // 2) Ownership del evento (via QuoteRequest) — 404 uniforme si el organizer no es dueño.
      const qr = await tx.quoteRequest.findUnique({
        where: { id: quote.quote_request_id },
        select: { eventId: true },
      });
      if (!qr) throw new QuoteNotFoundError();

      const eventRows = await tx.$queryRaw<EventOwnerRow[]>(
        Prisma.sql`SELECT user_id AS organizer_user_id FROM events WHERE id = ${qr.eventId}::uuid`,
      );
      const event = eventRows[0];
      if (!event || event.organizer_user_id !== currentUserId) {
        throw new QuoteNotFoundError();
      }

      // 3) Guard de estado (EC-01/EC-05).
      if (quote.status !== QuoteStatus.sent) {
        throw new QuoteNotRejectableError(quote.status);
      }

      // 4) UPDATE con guard defensivo `status='sent'` (blindaje contra tx aisladas).
      const updated = await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: QuoteStatus.rejected,
          rejectedAt: now,
          rejectionReason: reason,
        },
      });

      // 5) Resuelve `users.id` del vendor destinatario para el fan-out de notifications.
      const vendorRows = await tx.$queryRaw<VendorUserRow[]>(
        Prisma.sql`SELECT user_id FROM vendor_profiles WHERE id = ${quote.vendor_profile_id}::uuid`,
      );
      const vendor = vendorRows[0];
      if (!vendor) {
        // FK garantiza el vendor; si por integridad no aparece, colapsa a 404 uniforme.
        throw new QuoteNotFoundError();
      }

      await this.quoteEvents.emit({
        quoteId: updated.id,
        recipientUserId: vendor.user_id,
        eventName: 'quote.rejected',
        payload: {
          quote_id: updated.id,
          quote_request_id: quote.quote_request_id,
          rejection_reason: reason,
        },
        tx,
        correlationId: ctx.correlationId,
      });

      this.logger.emit('quote.rejected', {
        correlationId: ctx.correlationId,
        actorId: currentUserId,
        quoteId: updated.id,
        quoteRequestId: quote.quote_request_id,
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
