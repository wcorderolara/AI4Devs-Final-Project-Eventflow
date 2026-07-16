// US-055 (PB-P1-033 / QA-001) — Unit tests.
// Cobertura:
//   - `FrozenClock`: reloj congelado + `advance(days)` avanza en incrementos exactos de 24h y no
//     comparte referencia externa (defensive copy en `now()`).
//   - `ExpireQuoteRequestsUs055UseCase`: 0 candidatos (idempotente), 1 batch, 250 candidatos con
//     batches de 100 (3 iteraciones), fallo de batch corta el loop y registra `.batch.failed`,
//     `clockNow` estable dentro del run (misma fecha en todos los batches).
//   - `ExpireQuoteRequestsJob`: run.start + run.end sin excepción; jitter=0 → sin wait; jitter>0
//     aplica el random inyectado; excepción del UC absorbida y `run.failed` emitido.
import { describe, expect, it, vi } from 'vitest';
import { ExpireQuoteRequestsUs055UseCase } from '../../src/modules/quote-flow/application/expire-quote-requests.us055.use-case.js';
import { ExpireQuoteRequestsJob } from '../../src/jobs/expire-quote-requests.job.js';
import { FrozenClock } from '../../src/infrastructure/time/frozen-clock.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

interface Candidate {
  id: string;
}

/** Fabrica el UC con una `PrismaClient` fake que sirve `batches` en orden y luego `[]`. */
function makeUc(
  batches: Candidate[][],
  overrides: { throwOnBatch?: number; nowMs?: number; qrExpirationDays?: number } = {},
) {
  const emit = vi.fn();
  const logger: DomainEventLogger = { emit };
  const now = new Date(overrides.nowMs ?? Date.UTC(2026, 6, 28, 1, 0, 0));
  const clock: ClockPort = { now: () => new Date(now.getTime()) };

  let queryIdx = 0;
  const updateManyMock = vi.fn(async () => ({ count: 0 }));
  const observedClockNowValues: unknown[] = [];

  const tx = {
    async $queryRaw<T>(sql: { values?: unknown[] } | unknown): Promise<T> {
      // `Prisma.sql` construye un objeto `Prisma.Sql` con `.values` (parámetros posicionales).
      // El primer `${clockNow}` de la query del UC es `values[0]`.
      const values = (sql as { values?: unknown[] }).values ?? [];
      observedClockNowValues.push(values[0]);
      const idx = queryIdx++;
      if (overrides.throwOnBatch !== undefined && idx === overrides.throwOnBatch) {
        throw new Error('simulated batch failure');
      }
      return (batches[idx] ?? []) as unknown as T;
    },
    quoteRequest: { updateMany: updateManyMock },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new ExpireQuoteRequestsUs055UseCase(
    clock,
    logger,
    { qrExpirationDays: overrides.qrExpirationDays ?? 30, batchSize: 100 },
    prismaStub,
  );
  return { uc, emit, updateManyMock, observedClockNowValues };
}

function makeCandidate(id: string): Candidate {
  return { id };
}

describe('US-055 · FrozenClock', () => {
  it('now() devuelve el mismo instante inicial y una copia defensiva (no comparte referencia)', () => {
    const initial = new Date('2026-07-28T01:00:00Z');
    const clock = new FrozenClock(initial);
    const t1 = clock.now();
    const t2 = clock.now();
    expect(t1.toISOString()).toBe('2026-07-28T01:00:00.000Z');
    expect(t2.toISOString()).toBe('2026-07-28T01:00:00.000Z');
    expect(t1).not.toBe(t2);
    // Mutar `initial` externamente no debe afectar al reloj.
    initial.setUTCFullYear(2999);
    expect(clock.now().toISOString()).toBe('2026-07-28T01:00:00.000Z');
  });

  it('advance(days) desplaza el reloj en múltiplos exactos de 24h', () => {
    const clock = new FrozenClock(new Date('2026-07-28T01:00:00Z'));
    clock.advance(30);
    expect(clock.now().toISOString()).toBe('2026-08-27T01:00:00.000Z');
    clock.advance(-5);
    expect(clock.now().toISOString()).toBe('2026-08-22T01:00:00.000Z');
  });
});

describe('US-055 · ExpireQuoteRequestsUs055UseCase', () => {
  it('AC-03 idempotencia: 0 candidatos ⇒ totalExpired=0, no update ni batch log', async () => {
    const { uc, updateManyMock, emit } = makeUc([[]]);
    const result = await uc.execute({ correlationId: 'corr-55', runId: 'run-55' });
    expect(result.totalExpired).toBe(0);
    expect(result.batchCount).toBe(0);
    expect(result.errors).toEqual([]);
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      'quote_request.expired.run.end',
      expect.objectContaining({ totalExpired: 0, batchCount: 0, errorCount: 0 }),
    );
    const batchEmits = emit.mock.calls.filter((c) => c[0] === 'quote_request.expired.batch');
    expect(batchEmits).toHaveLength(0);
  });

  it('AC-01 1 batch: 3 candidatos ⇒ 3 expirados, 1 update, 1 batch log', async () => {
    const batch = [makeCandidate('q1'), makeCandidate('q2'), makeCandidate('q3')];
    const { uc, updateManyMock, emit } = makeUc([batch, []]);
    const result = await uc.execute({ correlationId: 'corr-55', runId: 'run-55' });
    expect(result.totalExpired).toBe(3);
    expect(result.batchCount).toBe(1);
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ['q1', 'q2', 'q3'] }, status: { in: ['sent', 'viewed'] } },
      data: { status: 'expired' },
    });
    const batchEmits = emit.mock.calls.filter((c) => c[0] === 'quote_request.expired.batch');
    expect(batchEmits).toHaveLength(1);
    expect(batchEmits[0]?.[1]).toMatchObject({ batchIndex: 0, count: 3 });
  });

  it('batching de 250 con batchSize=100 requiere 3 iteraciones (100+100+50)', async () => {
    const batchA = Array.from({ length: 100 }, (_, i) => makeCandidate(`a${i}`));
    const batchB = Array.from({ length: 100 }, (_, i) => makeCandidate(`b${i}`));
    const batchC = Array.from({ length: 50 }, (_, i) => makeCandidate(`c${i}`));
    const { uc, updateManyMock, emit } = makeUc([batchA, batchB, batchC, []]);
    const result = await uc.execute({ correlationId: 'corr', runId: 'run' });
    expect(result.totalExpired).toBe(250);
    expect(result.batchCount).toBe(3);
    expect(updateManyMock).toHaveBeenCalledTimes(3);
    const batchEmits = emit.mock.calls.filter((c) => c[0] === 'quote_request.expired.batch');
    expect(batchEmits).toHaveLength(3);
  });

  it('EC-02 fallo de batch: corta el loop, registra .batch.failed y devuelve errors[]', async () => {
    const batch = [makeCandidate('q1')];
    const { uc, emit } = makeUc([batch], { throwOnBatch: 0 });
    const result = await uc.execute({ correlationId: 'corr', runId: 'run' });
    expect(result.totalExpired).toBe(0);
    expect(result.batchCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain('simulated batch failure');
    expect(emit).toHaveBeenCalledWith(
      'quote_request.expired.batch.failed',
      expect.objectContaining({ batchIndex: 0 }),
    );
  });

  it('AC-04 clockNow estable dentro del run: mismo Date pasado a todos los batches', async () => {
    const batchA = Array.from({ length: 100 }, (_, i) => makeCandidate(`a${i}`));
    const batchB = Array.from({ length: 100 }, (_, i) => makeCandidate(`b${i}`));
    const { uc, observedClockNowValues } = makeUc([batchA, batchB, []], {
      nowMs: Date.UTC(2026, 6, 28, 1, 0, 0),
    });
    await uc.execute({});
    // El UC ejecuta 3 queries (2 batches con datos + 1 batch vacío que corta el loop).
    // Todas deben recibir exactamente el mismo `Date` (misma referencia inmutable capturada
    // al iniciar el run — AC-04).
    expect(observedClockNowValues).toHaveLength(3);
    const [d1, d2, d3] = observedClockNowValues as Date[];
    expect(d1).toBe(d2);
    expect(d2).toBe(d3);
    expect((d1 as Date).toISOString()).toBe('2026-07-28T01:00:00.000Z');
  });

  it('re-run inmediato es idempotente: segundo run con 0 candidatos ⇒ totalExpired=0', async () => {
    const { uc: uc1 } = makeUc([[]]);
    const { uc: uc2 } = makeUc([[]]);
    const r1 = await uc1.execute({});
    const r2 = await uc2.execute({});
    expect(r1.totalExpired).toBe(0);
    expect(r2.totalExpired).toBe(0);
  });
});

describe('US-055 · ExpireQuoteRequestsJob', () => {
  function makeJob(overrides: {
    ucExecute?: () => Promise<unknown>;
    jitterMaxMs?: number;
    randomValue?: number;
  } = {}) {
    const emit = vi.fn();
    const clock: ClockPort = { now: () => new Date(Date.UTC(2026, 6, 28, 1, 0, 0)) };
    const useCase = {
      execute:
        overrides.ucExecute ??
        (async () => ({ totalExpired: 0, batchCount: 0, durationMs: 0, errors: [] })),
    } as unknown as ExpireQuoteRequestsUs055UseCase;
    const waitMock = vi.fn(async () => {});
    const job = new ExpireQuoteRequestsJob(
      {
        useCase,
        clock,
        logger: { emit },
        cadence: '0 1 * * *',
        jitterMaxMs: overrides.jitterMaxMs ?? 0,
        batchSize: 100,
      },
      () => 'test-run-id',
      () => overrides.randomValue ?? 0.5,
      waitMock,
    );
    return { job, emit, waitMock, useCase };
  }

  it('happy path: emite run.start, invoca useCase y no llama a wait cuando jitterMaxMs=0', async () => {
    const { job, emit, waitMock } = makeJob();
    await job.run();
    expect(emit).toHaveBeenCalledWith(
      'quote_request.expired.run.start',
      expect.objectContaining({ correlationId: 'job-test-run-id', runId: 'test-run-id', jitterMs: 0 }),
    );
    expect(waitMock).not.toHaveBeenCalled();
  });

  it('AC-02 con jitterMaxMs > 0 aplica el jitter usando el random inyectado', async () => {
    const { job, emit, waitMock } = makeJob({ jitterMaxMs: 300_000, randomValue: 0.5 });
    await job.run();
    expect(waitMock).toHaveBeenCalledWith(150_000);
    expect(emit).toHaveBeenCalledWith(
      'quote_request.expired.run.start',
      expect.objectContaining({ jitterMs: 150_000 }),
    );
  });

  it('excepción del useCase se absorbe y emite quote_request.expired.run.failed', async () => {
    const boom = async () => {
      throw new Error('boom');
    };
    const { job, emit } = makeJob({ ucExecute: boom });
    await expect(job.run()).resolves.toBeUndefined();
    expect(emit).toHaveBeenCalledWith(
      'quote_request.expired.run.failed',
      expect.objectContaining({ correlationId: 'job-test-run-id', reason: 'boom' }),
    );
  });
});
