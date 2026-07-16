// ExpireQuoteRequestsUseCase (US-055 / BE-002). Tech Spec §7 UseCase. AC-01/03/05, EC-01..EC-04.
//
// Marca a `expired` todas las `QuoteRequest` con `status IN ('sent','viewed') AND created_at <
// clock_now::date - INTERVAL '$qrExpirationDays days'` en batches transaccionales
// `LIMIT $batchSize FOR UPDATE SKIP LOCKED` (Postgres). Sin notifications (D5 — BR-NOTIF-002
// no exige avisar al vendor/organizer de una QR expirada en MVP).
//
// - `sent_at` semántico (US-049): la QR se crea con `status='sent'` y `created_at`; el DTO de
//   US-049 expone `sent_at: qr.createdAt.toISOString()`. El schema NO tiene columna `sent_at`
//   en `quote_requests`, así que la query usa `created_at` (columna real) — misma semántica.
// - Idempotencia (AC-03): `status IN ('sent','viewed')` en el WHERE excluye las ya-expirados;
//   una segunda corrida del mismo día procesa 0 QRs.
// - Estados excluidos (AC-05): `responded`, `expired`, `cancelled` quedan fuera del filtro.
// - Concurrencia (§17 / EC-04): `SKIP LOCKED` deja que otro worker tome los siguientes N sin
//   colisión — ver test de concurrencia (QA-003).
// - Robustez (EC-02): un `try/catch` por batch preserva progreso: si un batch falla, se emite
//   `quote_request.expired.batch.failed`, se corta el loop del run y el next-run reintenta
//   (mismas filas quedan en el filtro porque el UPDATE del batch fallido revirtió).
import { Prisma, type PrismaClient } from '@prisma/client';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';

export interface ExpireQuoteRequestsInput {
  correlationId?: string;
  runId?: string;
  batchSize?: number;
}

export interface ExpireQuoteRequestsResult {
  totalExpired: number;
  batchCount: number;
  durationMs: number;
  errors: Array<{ batchIndex: number; message: string }>;
}

export interface ExpireQuoteRequestsConfig {
  qrExpirationDays: number;
  batchSize: number;
}

interface CandidateRow {
  id: string;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_EXPIRATION_DAYS = 30;
/** Corte máximo de iteraciones — defensa contra bug de `SKIP LOCKED` que no avance. */
const MAX_BATCHES = 10_000;

export class ExpireQuoteRequestsUs055UseCase {
  private readonly qrExpirationDays: number;
  private readonly defaultBatchSize: number;

  constructor(
    private readonly clock: ClockPort,
    private readonly logger: DomainEventLogger,
    config: Partial<ExpireQuoteRequestsConfig> = {},
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {
    this.qrExpirationDays = config.qrExpirationDays ?? DEFAULT_EXPIRATION_DAYS;
    this.defaultBatchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  async execute(input: ExpireQuoteRequestsInput = {}): Promise<ExpireQuoteRequestsResult> {
    const startedAt = this.clock.now().getTime();
    const batchSize = input.batchSize ?? this.defaultBatchSize;
    const correlationId = input.correlationId;
    const runId = input.runId;
    // Se resuelve una vez por run: mismo corte de día para todos los batches. Determinista
    // frente al `FrozenClock` en tests y estable dentro del run en producción.
    const clockNow = this.clock.now();

    let totalExpired = 0;
    let batchCount = 0;
    const errors: ExpireQuoteRequestsResult['errors'] = [];

    for (let iter = 0; iter < MAX_BATCHES; iter++) {
      let processed: number;
      try {
        processed = await this.processBatch(batchSize, clockNow, correlationId, runId, batchCount);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ batchIndex: batchCount, message });
        this.logger.emit('quote_request.expired.batch.failed', {
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

    this.logger.emit('quote_request.expired.run.end', {
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
    clockNow: Date,
    correlationId: string | undefined,
    runId: string | undefined,
    batchIndex: number,
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.$queryRaw<CandidateRow[]>(
        Prisma.sql`SELECT id
                     FROM quote_requests
                    WHERE status IN ('sent', 'viewed')
                      AND created_at < ${clockNow}::date - (${this.qrExpirationDays}::text || ' days')::interval
                    ORDER BY created_at ASC, id ASC
                    LIMIT ${batchSize}
                    FOR UPDATE SKIP LOCKED`,
      );
      if (candidates.length === 0) return 0;

      const ids = candidates.map((c) => c.id);
      // Filtro `status IN ('sent','viewed')` en el UPDATE es defensa en profundidad contra el
      // caso donde el SELECT lockeó filas que otro tx cambió antes de nuestro UPDATE (SKIP
      // LOCKED evita colisiones activas; este predicate blinda estados stale por tx aisladas).
      await tx.quoteRequest.updateMany({
        where: { id: { in: ids }, status: { in: ['sent', 'viewed'] } },
        data: { status: 'expired' },
      });

      this.logger.emit('quote_request.expired.batch', {
        correlationId,
        runId,
        batchIndex,
        count: candidates.length,
      });

      return candidates.length;
    });
  }
}
