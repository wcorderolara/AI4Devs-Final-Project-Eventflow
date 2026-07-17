// RespondQuoteRequestUseCase (US-052 / BE-002). Tech Spec §7 UseCase. AC-01..AC-04, EC-01..EC-07.
//
// Respuesta single-shot: crea un `Quote` en estado `sent`, transiciona el `QuoteRequest` a
// `responded` y emite 2 `notifications` al organizador dentro de una única transacción
// (`prisma.$transaction`) con `SELECT ... FOR UPDATE` sobre el QR. Un error en cualquier paso
// revierte todo (D9).
//
// Garantías (§17 riesgos):
//   1. `SELECT FOR UPDATE` previene doble Quote por 2 POST simultáneos.
//   2. Guard `status ∈ {sent, viewed}` + filtro lazy de expiración (`expires_at <= now`).
//   3. Recheck de `Quote` vigente (BR-QUOTE-013) contra el índice único parcial
//      `uq_quotes_request_active`; un P2002 concurrente ⇒ `QuoteAlreadyExistsError`.
//   4. Currency override server-side (SEC-04): el body puede traer `currency_code`, pero se
//      persiste la moneda del `Event` (DEV-04).
//   5. `valid_until` por default = clock.now() + 15 días @ 23:59:59 UTC (BR-QUOTE-015 / C-031).
//   6. INSERT 2 notifications (in_app + email_simulated) — mismo patrón que US-049.
//   7. Log estructurado `quote.sent` con `{correlationId, actorId, quoteId, quoteRequestId}`.
import { Prisma, type PrismaClient, QuoteStatus, QuoteRequestStatus } from '@prisma/client';
import type { QuoteNotificationSenderPort } from '../../../shared/application/quote-notification-sender.port.js';
import type { VendorProfileReader } from '../../../shared/access/readers.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import {
  QrNotFoundError,
  QrNotRespondableError,
  QuoteAlreadyExistsError,
  InvalidValidUntilError,
} from '../domain/us052.errors.js';
import type { RespondQuoteRequestBody } from '../dto/respond-quote.us052.request.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';

interface QuoteRequestLockRow {
  id: string;
  event_id: string;
  // US-058 (PB-P1-035 / DB-002): la Quote persistida en el `respond` copia el
  // `service_category_id` del QR padre para la denormalización que soporta el UNIQUE parcial.
  service_category_id: string;
  vendor_profile_id: string | null;
  status: QuoteRequestStatus;
  expires_at: Date | null;
}

interface EventReadRow {
  user_id: string;
  currency: SupportedCurrency;
}

const RESPONDABLE_STATUSES: readonly QuoteRequestStatus[] = [
  QuoteRequestStatus.sent,
  QuoteRequestStatus.viewed,
];

const VALID_UNTIL_MAX_DAYS = 90;
const DEFAULT_VALIDITY_DAYS = 15;

export interface RespondQuoteResponseView {
  id: string;
  quoteRequestId: string;
  vendorProfileId: string;
  status: 'sent';
  totalPrice: string;
  currencyCode: SupportedCurrency;
  breakdown: { label: string; amount: string }[];
  conditions: string | null;
  validUntil: string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface RespondQuoteRequestCtx {
  correlationId?: string;
}

export class RespondQuoteRequestUs052UseCase {
  constructor(
    private readonly vendors: VendorProfileReader,
    private readonly notifications: QuoteNotificationSenderPort,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(
    currentUserId: string,
    qrId: string,
    body: RespondQuoteRequestBody,
    ctx: RespondQuoteRequestCtx = {},
  ): Promise<RespondQuoteResponseView> {
    // Resuelve VendorProfile FUERA de la transacción — misma política que US-051.
    const vendorProfile = await this.vendors.findActiveByUserId(currentUserId);
    if (!vendorProfile || vendorProfile.status === 'hidden') {
      // Uniformidad SEC (D4): 404 QR_NOT_FOUND vía `QrNotFoundError` (mismo mapeo que US-051).
      throw new QrNotFoundError('Quote request not found');
    }

    const now = this.clock.now();
    const validUntil = this.resolveValidUntil(body.valid_until, now);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1) SELECT ... FOR UPDATE sobre QR filtrado por assignment.
        const qrRows = await tx.$queryRaw<QuoteRequestLockRow[]>(
          Prisma.sql`SELECT id, event_id, service_category_id, vendor_profile_id, status, expires_at
                       FROM quote_requests
                      WHERE id = ${qrId}::uuid
                        AND vendor_profile_id = ${vendorProfile.id}::uuid
                      FOR UPDATE`,
        );
        const qr = qrRows[0];
        if (!qr) throw new QrNotFoundError('Quote request not found');

        // 2) Guard de estado + expiración lazy.
        if (!RESPONDABLE_STATUSES.includes(qr.status)) {
          throw new QrNotRespondableError('status', qr.status);
        }
        if (qr.expires_at && qr.expires_at.getTime() <= now.getTime()) {
          throw new QrNotRespondableError('expired', qr.expires_at.toISOString());
        }

        // 3) Recheck de Quote vigente (`uq_quotes_request_active`: NOT IN {expired, rejected}).
        const existingQuote = await tx.quote.findFirst({
          where: {
            quoteRequestId: qrId,
            status: { notIn: [QuoteStatus.expired, QuoteStatus.rejected] },
          },
          select: { id: true },
        });
        if (existingQuote) {
          throw new QuoteAlreadyExistsError(existingQuote.id);
        }

        // 4) Lee currency + organizer del evento (fuente de verdad — DEV-04).
        const eventRows = await tx.$queryRaw<EventReadRow[]>(
          Prisma.sql`SELECT user_id, currency FROM events WHERE id = ${qr.event_id}::uuid`,
        );
        const event = eventRows[0];
        if (!event) {
          // FK garantiza el evento; si por integridad no aparece, colapsa a 404 uniforme.
          throw new QrNotFoundError('Quote request not found');
        }

        // 5) INSERT quote (status='sent', currency del evento, breakdown normalizado).
        // US-058 (PB-P1-035 / DB-002): `event_id` y `service_category_id` viven denormalizados
        // en `quotes` para soportar el UNIQUE parcial `(event_id, service_category_id) WHERE
        // is_preferred=true`. Se toman del QR padre (invariante enforced por FKs).
        const quote = await tx.quote.create({
          data: {
            quoteRequestId: qrId,
            vendorProfileId: vendorProfile.id,
            eventId: qr.event_id,
            serviceCategoryId: qr.service_category_id,
            status: QuoteStatus.sent,
            amount: new Prisma.Decimal(body.total_price),
            currency: event.currency,
            breakdown: body.breakdown as unknown as Prisma.InputJsonValue,
            conditions: body.conditions ?? null,
            validUntil,
            sentAt: now,
          },
        });

        // 6) UPDATE QR → responded.
        await tx.quoteRequest.update({
          where: { id: qrId },
          data: { status: QuoteRequestStatus.responded },
        });

        // 7) 2 notifications al organizer dentro del mismo tx.
        const notificationPayload = {
          quote_id: quote.id,
          quote_request_id: qrId,
          vendor_profile_id: vendorProfile.id,
          total_price: body.total_price,
          currency_code: event.currency,
          valid_until: validUntil.toISOString(),
        };
        await this.notifications.notify({
          channel: 'in_app',
          recipientUserId: event.user_id,
          event: 'quote.sent',
          deliveryStatus: 'delivered',
          payload: notificationPayload,
          tx,
        });
        await this.notifications.notify({
          channel: 'email_simulated',
          recipientUserId: event.user_id,
          event: 'quote.sent',
          deliveryStatus: 'simulated',
          payload: notificationPayload,
          tx,
        });

        this.logger.emit('quote.sent', {
          correlationId: ctx.correlationId,
          actorId: currentUserId,
          quoteId: quote.id,
          quoteRequestId: qrId,
        });

        return {
          id: quote.id,
          quoteRequestId: qrId,
          vendorProfileId: vendorProfile.id,
          status: 'sent',
          totalPrice: quote.amount.toFixed(2),
          currencyCode: event.currency,
          breakdown: body.breakdown.map((it) => ({ label: it.label, amount: it.amount })),
          conditions: body.conditions ?? null,
          validUntil: validUntil.toISOString(),
          sentAt: now.toISOString(),
          createdAt: quote.createdAt.toISOString(),
          updatedAt: quote.updatedAt.toISOString(),
        };
      });
    } catch (err) {
      // Carrera contra el índice único parcial `uq_quotes_request_active`.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new QuoteAlreadyExistsError('unknown');
      }
      throw err;
    }
  }

  private resolveValidUntil(rawIso: string | undefined, now: Date): Date {
    if (!rawIso) {
      const d = new Date(now.getTime());
      d.setUTCDate(d.getUTCDate() + DEFAULT_VALIDITY_DAYS);
      d.setUTCHours(23, 59, 59, 0);
      return d;
    }
    // Parseo estricto YYYY-MM-DD → 23:59:59 UTC del día.
    const [yStr, mStr, dStr] = rawIso.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    const parsed = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 0));
    if (Number.isNaN(parsed.getTime())) {
      // Nunca debería llegar: el DTO ya regex-valida el formato.
      throw new InvalidValidUntilError();
    }

    const today = new Date(now.getTime());
    today.setUTCHours(0, 0, 0, 0);
    const maxDate = new Date(today.getTime());
    maxDate.setUTCDate(maxDate.getUTCDate() + VALID_UNTIL_MAX_DAYS);
    maxDate.setUTCHours(23, 59, 59, 0);

    if (parsed.getTime() < today.getTime() || parsed.getTime() > maxDate.getTime()) {
      throw new InvalidValidUntilError();
    }
    return parsed;
  }
}

