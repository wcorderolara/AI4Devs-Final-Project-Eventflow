// US-015 / BE-003 + OBS-001. AutoCompletePastEventsUseCase.
//
// Orquesta `findExpiredActive(now - 2 días)` → `markCompleted` por evento con try/catch por
// evento (EC-04), Clock inyectado (AC-04) y logs `error` estructurados (§14 spec) usando el
// correlationId `job-<runId>` provisto por el caller (job). Es idempotente por construcción:
// el filtro `status='active'` en el repositorio excluye eventos ya `completed` (AC-02, EC-01).
// El use case NO emite `start`/`end` (esos son del job en BE-004/OBS-001).
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type { EventRepository } from '../ports/event.repository.js';

/** Contrato mínimo del logger que consume el use case (compatible con el logger central). */
export interface AutoCompleteLogger {
  info(payload: Record<string, unknown>): void;
  error(payload: Record<string, unknown>): void;
}

export interface AutoCompletePastEventsResult {
  affectedCount: number;
  errors: Array<{ eventId: string; message: string }>;
}

/** Ventana de gracia calendario declarada por AC-01 (T+2). */
export const AUTO_COMPLETE_GRACE_DAYS = 2;

function subDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

export class AutoCompletePastEventsUseCase {
  constructor(
    private readonly deps: {
      repo: EventRepository;
      clock: ClockPort;
      logger: AutoCompleteLogger;
    },
  ) {}

  async execute(input: { runId: string }): Promise<AutoCompletePastEventsResult> {
    const { repo, clock, logger } = this.deps;
    const { runId } = input;

    const now = clock.now();
    const expiredBefore = subDays(now, AUTO_COMPLETE_GRACE_DAYS);
    const candidates = await repo.findExpiredActive(expiredBefore);

    let affectedCount = 0;
    const errors: Array<{ eventId: string; message: string }> = [];

    for (const candidate of candidates) {
      try {
        const { affected } = await repo.markCompleted(candidate.id, {
          autoCompleted: true,
          completedAt: now,
        });
        if (affected > 0) {
          affectedCount += affected;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ eventId: candidate.id, message });
        // EC-04: falla parcial. Se loguea el error por evento y se continúa con el resto.
        logger.error({
          event: 'job.autoComplete.error',
          correlationId: `job-${runId}`,
          runId,
          eventId: candidate.id,
          errorMessage: message,
        });
      }
    }

    return { affectedCount, errors };
  }
}
