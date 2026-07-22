// US-034 (PB-P2-004 / OPS-001). `EmitT7NotificationsJob`.
//
// Envuelve el `EmitT7NotificationsUseCase` con:
//   * `correlationId = job-emit-t7-<ISO8601(now)>` artificial (AC-05, tech spec §14).
//   * Logs `job.t7Notifications.start` / `job.t7Notifications.end` (patrón de
//     `AutoCompletePastEventsJob` — US-015).
//   * Try/catch defensivo alrededor del `execute` que absorbe la excepción para no
//     tumbar el scheduler; el use case ya captura por chunk. Una falla catastrófica se
//     registra en el log `end` con `affected=0`.
import type { ClockPort } from '../shared/domain/clock.port.js';
import type {
  EmitT7Logger,
  EmitT7NotificationsUseCase,
} from '../modules/notifications/application/emit-t7-notifications.use-case.js';

export interface EmitT7NotificationsJobDeps {
  useCase: EmitT7NotificationsUseCase;
  clock: ClockPort;
  logger: EmitT7Logger;
  cadence: string;
}

export class EmitT7NotificationsJob {
  constructor(private readonly deps: EmitT7NotificationsJobDeps) {}

  async run(): Promise<void> {
    const { useCase, clock, logger, cadence } = this.deps;
    const startedAt = clock.now();
    const correlationId = `job-emit-t7-${startedAt.toISOString()}`;

    logger.info({
      event: 'job.t7Notifications.start',
      correlationId,
      cadence,
      scheduledAt: startedAt.toISOString(),
    });

    let affected = 0;
    let scannedChunks = 0;
    try {
      const result = await useCase.execute({ correlationId });
      affected = result.affected;
      scannedChunks = result.scannedChunks;
    } catch (err) {
      logger.error({
        event: 'job.t7Notifications.failed',
        correlationId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      const durationMs = clock.now().getTime() - startedAt.getTime();
      logger.info({
        event: 'job.t7Notifications.end',
        correlationId,
        durationMs,
        affected,
        scannedChunks,
      });
    }
  }
}
