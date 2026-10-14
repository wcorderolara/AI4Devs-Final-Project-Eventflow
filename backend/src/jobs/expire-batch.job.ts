// Job base de expiración por batches (US-053 `ExpireQuotesJob` / US-055 `ExpireQuoteRequestsJob`).
// Tech Spec §7 Job. Envuelve al UC de expiración con:
//   - Correlation ID `job-<runId>` (mismo patrón que `AutoCompletePastEventsJob`).
//   - Jitter random `[0..jitterMaxMs]` antes de ejecutar (§17: desincroniza réplicas y jobs que
//     comparten cron). El jitter es 0 en tests (`jitterMaxMs=0`) o inyectando `random`.
//   - Log `<prefix>.expired.run.start`; el UC emite `<prefix>.expired.batch[.failed]` por batch.
//   - Try/catch que absorbe la excepción para no tumbar el scheduler; en fallo catastrófico se
//     emite `<prefix>.expired.run.failed`.
import { v4 as uuidv4 } from 'uuid';
import type { ClockPort } from '../shared/domain/clock.port.js';
import type { DomainEventLogger } from '../shared/observability/domain-event-logger.js';

export interface ExpireBatchUseCase {
  execute(input: { correlationId?: string; runId?: string; batchSize?: number }): Promise<unknown>;
}

export interface ExpireBatchJobDeps<U extends ExpireBatchUseCase = ExpireBatchUseCase> {
  useCase: U;
  clock: ClockPort;
  logger: DomainEventLogger;
  cadence: string;
  /** Máximo del jitter aplicado antes de invocar el UC (ms). `0` deshabilita el jitter. */
  jitterMaxMs: number;
  /** Batch size opcional (default 100 en el UC). */
  batchSize?: number;
}

export abstract class ExpireBatchJob {
  /** Prefijo de los eventos de log (`quote` | `quote_request`). */
  protected abstract readonly eventPrefix: string;

  constructor(
    private readonly deps: ExpireBatchJobDeps,
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

    logger.emit(`${this.eventPrefix}.expired.run.start`, {
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
      logger.emit(`${this.eventPrefix}.expired.run.failed`, {
        correlationId,
        runId,
        durationMs: clock.now().getTime() - startedAt.getTime(),
        reason: message,
      });
    }
  }
}
