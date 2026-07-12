// US-015 / QA-001 (unit) — AutoCompletePastEventsUseCase + AutoCompletePastEventsJob.
// Cubre AC-01, AC-02, AC-04, AC-05, EC-01..EC-05, NT-01..NT-06 sin BD (fakes en memoria).
// El Clock injectable habilita determinismo (AC-04); el logger capturado verifica
// `start`/`end`/`error` con `correlationId=job-<runId>` (AC-05, §14 spec).
import { describe, it, expect } from 'vitest';
import {
  AutoCompletePastEventsUseCase,
  type AutoCompleteLogger,
} from '../../src/modules/event-planning/application/auto-complete-past-events.use-case.js';
import { AutoCompletePastEventsJob } from '../../src/jobs/auto-complete-past-events.job.js';
import type { EventRepository, ExpiredActiveEventRow } from '../../src/modules/event-planning/ports/event.repository.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

class FixedClock implements ClockPort {
  constructor(private t: Date) {}
  now(): Date {
    return new Date(this.t.getTime());
  }
  advance(ms: number): void {
    this.t = new Date(this.t.getTime() + ms);
  }
}

interface FakeRow extends ExpiredActiveEventRow {
  /** Estado interno del fake para simular idempotencia y transiciones. */
  status: 'active' | 'completed' | 'cancelled' | 'draft';
  deletedAt: Date | null;
}

class FakeEventRepo implements Partial<EventRepository> {
  rows: FakeRow[] = [];
  failOn = new Set<string>();
  /** History: cada llamada exitosa a `markCompleted` se registra para verificar orden y payload. */
  marks: Array<{ id: string; completedAt: Date; autoCompleted: boolean }> = [];

  seed(rows: Array<Partial<FakeRow> & { id: string; eventDate: Date }>): void {
    this.rows.push(
      ...rows.map((r) => ({
        id: r.id,
        eventDate: r.eventDate,
        status: r.status ?? 'active',
        deletedAt: r.deletedAt ?? null,
      })),
    );
  }

  findExpiredActive(expiredBefore: Date): Promise<ExpiredActiveEventRow[]> {
    // Reproduce el filtro SQL: status='active' AND deletedAt IS NULL AND eventDate <= expiredBefore.
    const matches = this.rows.filter(
      (r) => r.status === 'active' && r.deletedAt === null && r.eventDate.getTime() <= expiredBefore.getTime(),
    );
    return Promise.resolve(matches.map((r) => ({ id: r.id, eventDate: r.eventDate })));
  }

  markCompleted(
    eventId: string,
    fields: { autoCompleted: boolean; completedAt: Date },
  ): Promise<{ affected: number }> {
    if (this.failOn.has(eventId)) {
      return Promise.reject(new Error(`boom-${eventId}`));
    }
    const row = this.rows.find((r) => r.id === eventId);
    // Filtro defensivo del `updateMany`: sólo cambia si sigue `active` + no borrado.
    if (!row || row.status !== 'active' || row.deletedAt !== null) {
      return Promise.resolve({ affected: 0 });
    }
    row.status = 'completed';
    this.marks.push({ id: eventId, completedAt: fields.completedAt, autoCompleted: fields.autoCompleted });
    return Promise.resolve({ affected: 1 });
  }
}

interface CapturedLog {
  level: 'info' | 'error';
  payload: Record<string, unknown>;
}

function makeLogger(): { logger: AutoCompleteLogger; captured: CapturedLog[] } {
  const captured: CapturedLog[] = [];
  const logger: AutoCompleteLogger = {
    info: (p) => captured.push({ level: 'info', payload: p }),
    error: (p) => captured.push({ level: 'error', payload: p }),
  };
  return { logger, captured };
}

function ymd(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

describe('US-015 — AutoCompletePastEventsUseCase (unit, sin BD)', () => {
  it('AC-01 / EC-05: sin eventos elegibles → affectedCount=0 y sin llamadas a markCompleted', async () => {
    const repo = new FakeEventRepo();
    // Sólo eventos futuros o ya completados: ninguno debe procesarse.
    repo.seed([
      { id: 'e-future', eventDate: ymd('2100-01-01') },
      { id: 'e-completed', eventDate: ymd('2020-01-01'), status: 'completed' },
    ]);
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger, captured } = makeLogger();

    const uc = new AutoCompletePastEventsUseCase({
      repo: repo as unknown as EventRepository,
      clock,
      logger,
    });
    const result = await uc.execute({ runId: 'run-1' });

    expect(result.affectedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(repo.marks).toHaveLength(0);
    expect(captured.filter((c) => c.level === 'error')).toHaveLength(0);
  });

  it('AC-01 / AC-04: procesa eventos con event_date + 2 días ≤ clock.today() y setea completedAt=clock.now()', async () => {
    const repo = new FakeEventRepo();
    // Clock fijo en 2026-07-11 → cutoff = 2026-07-09; sólo `e-eligible` está en o antes del cutoff.
    repo.seed([
      { id: 'e-boundary', eventDate: ymd('2026-07-09') },
      { id: 'e-eligible', eventDate: ymd('2026-07-08') },
      { id: 'e-day-after', eventDate: ymd('2026-07-10') },
    ]);
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger } = makeLogger();

    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });
    const result = await uc.execute({ runId: 'run-2' });

    expect(result.affectedCount).toBe(2);
    expect(repo.marks.map((m) => m.id).sort()).toEqual(['e-boundary', 'e-eligible']);
    // completedAt = clock.now() (determinismo).
    expect(repo.marks[0]!.completedAt.toISOString()).toBe(ymd('2026-07-11').toISOString());
    expect(repo.marks.every((m) => m.autoCompleted === true)).toBe(true);
  });

  it('AC-02 / EC-01: idempotencia — segunda corrida sobre eventos ya completed devuelve affectedCount=0', async () => {
    const repo = new FakeEventRepo();
    repo.seed([{ id: 'e-1', eventDate: ymd('2026-07-01') }]);
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger } = makeLogger();
    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });

    const first = await uc.execute({ runId: 'run-a' });
    const second = await uc.execute({ runId: 'run-b' });

    expect(first.affectedCount).toBe(1);
    expect(second.affectedCount).toBe(0);
  });

  it('EC-01 / NT-01..NT-05: excluye draft, cancelled, completed y soft-deleted (deletedAt != null)', async () => {
    const repo = new FakeEventRepo();
    repo.seed([
      { id: 'draft', eventDate: ymd('2026-07-01'), status: 'draft' },
      { id: 'cancelled', eventDate: ymd('2026-07-01'), status: 'cancelled' },
      { id: 'completed', eventDate: ymd('2026-07-01'), status: 'completed' },
      { id: 'soft-deleted', eventDate: ymd('2026-07-01'), status: 'active', deletedAt: ymd('2026-07-02') },
      { id: 'active-elegible', eventDate: ymd('2026-07-01'), status: 'active' },
    ]);
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger } = makeLogger();
    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });

    const result = await uc.execute({ runId: 'run-x' });
    expect(result.affectedCount).toBe(1);
    expect(repo.marks.map((m) => m.id)).toEqual(['active-elegible']);
  });

  it('EC-04 / NT-06: falla parcial — un evento lanza; el job continúa y loguea job.autoComplete.error', async () => {
    const repo = new FakeEventRepo();
    repo.seed([
      { id: 'ok-1', eventDate: ymd('2026-07-01') },
      { id: 'boom', eventDate: ymd('2026-07-01') },
      { id: 'ok-2', eventDate: ymd('2026-07-01') },
    ]);
    repo.failOn.add('boom');
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger, captured } = makeLogger();
    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });

    const result = await uc.execute({ runId: 'run-boom' });
    expect(result.affectedCount).toBe(2);
    expect(result.errors.map((e) => e.eventId)).toEqual(['boom']);

    const errorLog = captured.find((c) => c.level === 'error');
    expect(errorLog).toBeDefined();
    expect(errorLog!.payload.event).toBe('job.autoComplete.error');
    expect(errorLog!.payload.runId).toBe('run-boom');
    expect(errorLog!.payload.eventId).toBe('boom');
    expect(errorLog!.payload.correlationId).toBe('job-run-boom');
  });
});

describe('US-015 — AutoCompletePastEventsJob (unit)', () => {
  it('AC-05: emite job.autoComplete.start y job.autoComplete.end con correlationId=job-<runId>', async () => {
    const repo = new FakeEventRepo();
    repo.seed([{ id: 'e-1', eventDate: ymd('2026-07-01') }]);
    const clock = new FixedClock(new Date('2026-07-11T00:30:00Z'));
    const { logger, captured } = makeLogger();
    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });

    const runIds = ['run-fixed'];
    const job = new AutoCompletePastEventsJob(
      { useCase: uc, clock, logger, cadence: '30 0 * * *' },
      () => runIds.shift() ?? 'run-fallback',
    );
    await job.run();

    const startLog = captured.find((c) => c.payload.event === 'job.autoComplete.start');
    const endLog = captured.find((c) => c.payload.event === 'job.autoComplete.end');
    expect(startLog).toBeDefined();
    expect(endLog).toBeDefined();
    expect(startLog!.payload.correlationId).toBe('job-run-fixed');
    expect(startLog!.payload.cadence).toBe('30 0 * * *');
    expect(startLog!.payload.scheduledAt).toBe(new Date('2026-07-11T00:30:00Z').toISOString());
    expect(endLog!.payload.correlationId).toBe('job-run-fixed');
    expect(endLog!.payload.affectedCount).toBe(1);
    expect(typeof endLog!.payload.durationMs).toBe('number');
  });

  it('AC-05 / EC-05: end log lleva affectedCount=0 cuando no hay elegibles', async () => {
    const repo = new FakeEventRepo();
    const clock = new FixedClock(ymd('2026-07-11'));
    const { logger, captured } = makeLogger();
    const uc = new AutoCompletePastEventsUseCase({ repo: repo as unknown as EventRepository, clock, logger });
    const job = new AutoCompletePastEventsJob(
      { useCase: uc, clock, logger, cadence: '30 0 * * *' },
      () => 'run-empty',
    );

    await job.run();
    const endLog = captured.find((c) => c.payload.event === 'job.autoComplete.end');
    expect(endLog!.payload.affectedCount).toBe(0);
  });
});
