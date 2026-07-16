// ExpireQuotesUseCase (US-053 / BE-001). Tech Spec §7 UseCase. AC-02/03/04, EC-01..EC-04.
//
// Marca a `expired` todos los `Quote` con `status='sent' AND valid_until < CURRENT_DATE` en
// batches transaccionales `FOR UPDATE SKIP LOCKED` (Postgres). Por cada Quote transicionado
// emite 2 `Notification` al vendor asignado (`in_app` delivered + `email_simulated` simulated)
// dentro de la misma transacción — si cualquier INSERT falla el batch se revierte y esos Quotes
// se re-procesan en la siguiente iteración/próximo run (idempotente por AC-03).
//
// - Corte de día (AC-04): `valid_until < CURRENT_DATE` en Postgres = "estrictamente antes del
//   inicio del día actual en UTC" (`CURRENT_DATE` es date, no timestamp). Un Quote con
//   `valid_until = today 23:59:59Z` sigue vigente porque la comparación `date < date_today` es
//   falsa cuando el timestamp cae en el mismo día calendario.
// - Idempotencia (AC-03): `status='sent'` en el WHERE excluye ya-expirados; una segunda corrida
//   del mismo día procesa 0 Quotes.
// - Concurrencia (§17): `SKIP LOCKED` deja que otro worker tome los siguientes 100 sin colisión.
// - Robustez (EC-04): un `try/catch` por batch preserva progreso: si un batch falla se registra
//   `quote.expired.batch.failed` con el error y se corta el loop; el siguiente run reintenta.
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
// US-054 (BE-004): refactor — invoca `QuoteNotificationService.emitQuoteStateChange` en lugar
// de duplicar las 2 llamadas a `NotificationSenderPort.notify`. Preserva la atomicidad por batch
// (el service recibe `tx` y emite las 2 rows dentro de la misma transacción).
import type { QuoteNotificationService } from '../services/quote-notification.service.js';

export interface ExpireQuotesInput {
  correlationId?: string;
  runId?: string;
  batchSize?: number;
}

export interface ExpireQuotesResult {
  totalExpired: number;
  batchCount: number;
  durationMs: number;
  errors: Array<{ batchIndex: number; message: string }>;
}

interface CandidateRow {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  valid_until: Date;
}

interface VendorUserRow {
  id: string;
  user_id: string;
}

const DEFAULT_BATCH_SIZE = 100;
/** Corte máximo de iteraciones (defensa contra bug de `SKIP LOCKED` que no avance). */
const MAX_BATCHES = 10_000;

export class ExpireQuotesUs053UseCase {
  constructor(
    private readonly quoteNotifications: QuoteNotificationService,
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(input: ExpireQuotesInput = {}): Promise<ExpireQuotesResult> {
    const startedAt = this.clock.now().getTime();
    const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
    const correlationId = input.correlationId;
    const runId = input.runId;

    let totalExpired = 0;
    let batchCount = 0;
    const errors: ExpireQuotesResult['errors'] = [];

    for (let iter = 0; iter < MAX_BATCHES; iter++) {
      let processed: number;
      try {
        processed = await this.processBatch(batchSize, correlationId, runId, batchCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ batchIndex: batchCount, message });
        this.logger.emit('quote.expired.batch.failed', {
          correlationId,
          runId,
          batchIndex: batchCount,
          reason: message,
        });
        break;
      }
      if (processed === 0) break;
      totalExpired += processed;
      batchCount += 1;
    }

    const durationMs = this.clock.now().getTime() - startedAt;

    this.logger.emit('quote.expired.run.end', {
      correlationId,
      runId,
      totalExpired,
      batchCount,
      durationMs,
      errorCount: errors.length,
    });

    return { totalExpired, batchCount, durationMs, errors };
  }

  private async processBatch(
    batchSize: number,
    correlationId: string | undefined,
    runId: string | undefined,
    batchIndex: number,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<CandidateRow[]>(
        Prisma.sql`SELECT id, quote_request_id, vendor_profile_id, valid_until
                     FROM quotes
                    WHERE status = 'sent' AND valid_until < CURRENT_DATE
                    ORDER BY valid_until ASC, id ASC
                    LIMIT ${batchSize}
                    FOR UPDATE SKIP LOCKED`,
      );
      if (candidates.length === 0) return 0;

      const ids = candidates.map((c) => c.id);
      // Filtro `status='sent'` en el UPDATE es defensa en profundidad contra el caso donde
      // el SELECT lockeó rows que otro tx cambió antes de nuestro UPDATE (SKIP LOCKED evita
      // colisiones activas; este predicate blinda estados stale por tx aisladas).
      await tx.quote.updateMany({
        where: { id: { in: ids }, status: 'sent' },
        data: { status: 'expired', expiredAt: this.clock.now() },
      });

      // Resuelve los `user_id` de los vendors en un solo query.
      const vpIds = Array.from(new Set(candidates.map((c) => c.vendor_profile_id)));
      const vendorRows = await tx.$queryRaw<VendorUserRow[]>(
        Prisma.sql`SELECT id, user_id FROM vendor_profiles WHERE id IN (${Prisma.join(vpIds)})`,
      );
      const vendorByVpId = new Map(vendorRows.map((r) => [r.id, r.user_id]));

      for (const c of candidates) {
        const recipient = vendorByVpId.get(c.vendor_profile_id);
        if (!recipient) {
          // El FK garantiza que el vendor existe; si por integridad no aparece, saltamos
          // la notificación de ese Quote y seguimos (el UPDATE ya persistió el `expired`).
          continue;
        }
        const payload = {
          quote_id: c.id,
          quote_request_id: c.quote_request_id,
          valid_until: c.valid_until.toISOString(),
        };
        // US-054 (BE-004): fan-out delegado al service común — mismas 2 Notifications atómicas.
        await this.quoteNotifications.emitQuoteStateChange({
          quoteId: c.id,
          vendorUserId: recipient,
          eventName: 'quote.expired',
          payload,
          tx,
          correlationId,
        });
      }

      this.logger.emit('quote.expired.batch', {
        correlationId,
        runId,
        batchIndex,
        count: candidates.length,
      });

      return candidates.length;
    });
  }
}
