// ExpireQuoteRequestsJob (US-055 / BE-004). Tech Spec §7 Job. AC-01, AC-02.
//
// Envuelve al `ExpireQuoteRequestsUs055UseCase` con:
//   - Correlation ID `job-<runId>` (mismo patrón que `ExpireQuotesJob` de US-053).
//   - Jitter random `[0..JOBS_EXPIRE_QUOTE_REQUESTS_JITTER_MAX_MS]` antes de ejecutar (§17
//     riesgo concurrencia: aunque el cron coincide con `ExpireQuotesJob` a las 01:00 UTC,
//     el jitter desincroniza las réplicas del scheduler y las curvas de dos jobs distintos).
//   - Logs canónicos `quote_request.expired.run.start` / `.run.end` — el UC emite
//     `quote_request.expired.batch` por batch y `quote_request.expired.batch.failed` al fallar.
//   - Try/catch en el `run` que absorbe la excepción para no tumbar el scheduler; en fallo
//     catastrófico se emite `quote_request.expired.run.failed` (canal `error`).
import { v4 as uuidv4 } from 'uuid';
import type { ClockPort } from '../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../shared/observability/domain-event-logger.js';
import type { ExpireQuoteRequestsUs055UseCase } from '../modules/quote-flow/application/expire-quote-requests.us055.use-case.js';

export interface ExpireQuoteRequestsJobDeps {
  useCase: ExpireQuoteRequestsUs055UseCase;
  clock: ClockPort;
  logger: DomainEventLogger;
  cadence: string;
  /** Máximo del jitter aplicado antes de invocar el UC (ms). `0` deshabilita el jitter. */
  jitterMaxMs: number;
  /** Batch size opcional (default 100 en el UC). */
  batchSize?: number;
}

export class ExpireQuoteRequestsJob {
  constructor(
    private readonly deps: ExpireQuoteRequestsJobDeps,
    private readonly generateRunId: () => string = uuidv4,
    /** Sustituible en tests para determinismo. Debe devolver un número en `[0..1)`. */
    private readonly random: () => number = Math.random,
    /** Sustituible en tests para no dormir de verdad. */
    private readonly wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  async run(): Promise<void> {
    const { useCase, clock, logger, cadence, jitterMaxMs, batchSize } = this.deps;
    const runId = this.generateRunId();
    const correlationId = `job-${runId}`;
    const jitterMs = jitterMaxMs > 0 ? Math.floor(this.random() * jitterMaxMs) : 0;

    logger.emit('quote_request.expired.run.start', {
      correlationId,
      runId,
      reason: cadence,
      jitterMs,
    });

    if (jitterMs > 0) {
      await this.wait(jitterMs);
    }

    const startedAt = clock.now();
    try {
      await useCase.execute({ correlationId, runId, batchSize });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.emit('quote_request.expired.run.failed', {
        correlationId,
        runId,
        durationMs: clock.now().getTime() - startedAt.getTime(),
        reason: message,
      });
    }
  }
}
