// ExpireQuotesJob (US-053 / BE-002). Tech Spec §7 Job. AC-02.
//
// Envuelve al `ExpireQuotesUs053UseCase` con:
//   - Correlation ID `job-<runId>` (mismo patrón que `AutoCompletePastEventsJob`).
//   - Jitter random `[0..JOBS_EXPIRE_QUOTES_JITTER_MAX_MS]` antes de ejecutar (§17 riesgo #1:
//     evita que varias réplicas concurrentes golpeen la BD al mismo instante). El jitter es 0
//     en tests (`jitterMaxMs=0`) o inyectando `randomMs=() => 0`.
//   - Logs canónicos `quote.expired.run.start` / `quote.expired.run.end` — el UC emite
//     `quote.expired.batch` por batch y `quote.expired.batch.failed` al fallar.
//   - Try/catch en el `run` que absorbe la excepción para no tumbar el scheduler; en fallo
//     catastrófico se emite `quote.expired.run.failed` (canal `error`).
import { v4 as uuidv4 } from 'uuid';
import type { ClockPort } from '../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../shared/observability/domain-event-logger.js';
import type { ExpireQuotesUs053UseCase } from '../modules/quote-flow/application/expire-quotes.us053.use-case.js';

export interface ExpireQuotesJobDeps {
  useCase: ExpireQuotesUs053UseCase;
  clock: ClockPort;
  logger: DomainEventLogger;
  cadence: string;
  /** Máximo del jitter aplicado antes de invocar el UC (ms). `0` deshabilita el jitter. */
  jitterMaxMs: number;
  /** Batch size opcional (default 100 en el UC). */
  batchSize?: number;
}

export class ExpireQuotesJob {
  constructor(
    private readonly deps: ExpireQuotesJobDeps,
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

    logger.emit('quote.expired.run.start', {
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
      logger.emit('quote.expired.run.failed', {
        correlationId,
        runId,
        durationMs: clock.now().getTime() - startedAt.getTime(),
        reason: message,
      });
    }
  }
}
