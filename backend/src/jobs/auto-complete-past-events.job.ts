// US-015 / BE-004 + OBS-001. AutoCompletePastEventsJob.
//
// Envuelve la invocación al `AutoCompletePastEventsUseCase` con los logs canónicos
// `job.autoComplete.start` / `job.autoComplete.end` (§14 spec) y genera `runId` único por
// ejecución (correlationId `job-<runId>`, análogo a ADR-API-004). No relanza errores: el use
// case ya captura por evento y emite `job.autoComplete.error`; una falla catastrófica en el
// use case se registra en el `end` con `affectedCount=0` y se propaga al scheduler adapter,
// que la absorbe (no reintenta hasta la próxima cadencia).
import { v4 as uuidv4 } from 'uuid';
import type { ClockPort } from '../shared/domain/clock.port.js';
import type {
  AutoCompletePastEventsUseCase,
  AutoCompleteLogger,
} from '../modules/event-planning/application/auto-complete-past-events.use-case.js';

export class AutoCompletePastEventsJob {
  constructor(
    private readonly deps: {
      useCase: AutoCompletePastEventsUseCase;
      clock: ClockPort;
      logger: AutoCompleteLogger;
      cadence: string;
    },
    private readonly generateRunId: () => string = uuidv4,
  ) {}

  async run(): Promise<void> {
    const { useCase, clock, logger, cadence } = this.deps;
    const runId = this.generateRunId();
    const startedAt = clock.now();

    logger.info({
      event: 'job.autoComplete.start',
      correlationId: `job-${runId}`,
      runId,
      cadence,
      scheduledAt: startedAt.toISOString(),
      clockNow: startedAt.toISOString(),
    });

    let affectedCount = 0;
    try {
      const result = await useCase.execute({ runId });
      affectedCount = result.affectedCount;
    } finally {
      const durationMs = clock.now().getTime() - startedAt.getTime();
      logger.info({
        event: 'job.autoComplete.end',
        correlationId: `job-${runId}`,
        runId,
        durationMs,
        affectedCount,
      });
    }
  }
}
