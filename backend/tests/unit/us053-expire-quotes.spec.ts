// US-053 (PB-P1-031 / QA-001) — Unit tests.
// Cobertura:
//   - `ExpireQuotesUs053UseCase`: 0 quotes, 1 batch, boundary de idempotencia (2do run vacío),
//     batching de 250 con `batchSize=100` (3 iteraciones), rollback lógico (batch fallido corta
//     el loop y emite `.batch.failed`).
//   - `ExpireQuotesJob`: run.start + run.end sin excepción; jitter=0 → sin wait; excepción del
//     UC absorbida y `run.failed` emitido.
import { describe, expect, it, vi } from 'vitest';
import { ExpireQuotesUs053UseCase } from '../../src/modules/quote-flow/application/expire-quotes.us053.use-case.js';
import { ExpireQuotesJob } from '../../src/jobs/expire-quotes.job.js';
import type {
  NotifyInput,
  QuoteNotificationSenderPort,
} from '../../src/shared/application/quote-notification-sender.port.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const VP_A = '11111111-1111-1111-1111-1111111111a1';
const VP_B = '11111111-1111-1111-1111-1111111111b1';
const USER_A = '22222222-2222-2222-2222-2222222222a2';
const USER_B = '22222222-2222-2222-2222-2222222222b2';

interface Candidate {
  id: string;
  quote_request_id: string;
  vendor_profile_id: string;
  valid_until: Date;
}

/** Fabrica el UC con una `PrismaClient` fake que sirve `batches` en orden y luego `[]`. */
function makeUc(
  batches: Candidate[][],
  overrides: { throwOnBatch?: number; nowMs?: number } = {},
) {
  const notify = vi.fn<(input: NotifyInput) => Promise<void>>(async () => {});
  const notifications: QuoteNotificationSenderPort = { notify };
  const emit = vi.fn();
  const logger: DomainEventLogger = { emit };
  const now = new Date(overrides.nowMs ?? Date.UTC(2026, 6, 16, 12, 0, 0));
  const clock: ClockPort = { now: () => now };

  let queryIdx = 0;
  const updateManyMock = vi.fn(async () => ({ count: 0 }));

  const tx = {
    async $queryRaw<T>(): Promise<T> {
      const idx = queryIdx++;
      // El UC hace 2 queries por batch: candidates + vendor_profiles.
      const batchIdx = Math.floor(idx / 2);
      const isCandidateQuery = idx % 2 === 0;

      if (overrides.throwOnBatch !== undefined && batchIdx === overrides.throwOnBatch && isCandidateQuery) {
        throw new Error('simulated batch failure');
      }
      if (isCandidateQuery) {
        return (batches[batchIdx] ?? []) as unknown as T;
      }
      // Vendor lookup: devuelve una fila por vp único.
      const currentBatch = batches[batchIdx] ?? [];
      const uniqueVps = Array.from(new Set(currentBatch.map((c) => c.vendor_profile_id)));
      const rows = uniqueVps.map((vp) => ({
        id: vp,
        user_id: vp === VP_A ? USER_A : USER_B,
      }));
      return rows as unknown as T;
    },
    quote: { updateMany: updateManyMock },
  };

  const prismaStub = {
    async $transaction<T>(cb: (tx: unknown) => Promise<T>): Promise<T> {
      return cb(tx);
    },
  } as unknown as import('@prisma/client').PrismaClient;

  const uc = new ExpireQuotesUs053UseCase(notifications, clock, logger, prismaStub);
  return { uc, notify, emit, updateManyMock };
}

function makeCandidate(id: string, vp: string = VP_A): Candidate {
  return {
    id,
    quote_request_id: `qr-${id}`,
    vendor_profile_id: vp,
    valid_until: new Date('2026-07-15T00:00:00Z'),
  };
}

describe('US-053 · ExpireQuotesUs053UseCase', () => {
  it('AC-03 idempotencia: 0 candidatos ⇒ totalExpired=0, no notifica ni update', async () => {
    const { uc, notify, updateManyMock, emit } = makeUc([[]]);
    const result = await uc.execute({ correlationId: 'corr-53', runId: 'run-53' });
    expect(result.totalExpired).toBe(0);
    expect(result.batchCount).toBe(0);
    expect(result.errors).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
    // Debe emitir `run.end` con totalExpired=0.
    expect(emit).toHaveBeenCalledWith(
      'quote.expired.run.end',
      expect.objectContaining({ totalExpired: 0, batchCount: 0 }),
    );
  });

  it('1 batch: 3 candidatos ⇒ 3 expirados, 6 notifications (2 por quote), 1 batch log', async () => {
    const batch = [makeCandidate('q1'), makeCandidate('q2', VP_B), makeCandidate('q3')];
    const { uc, notify, emit, updateManyMock } = makeUc([batch, []]);
    const result = await uc.execute({ correlationId: 'corr-53', runId: 'run-53' });
    expect(result.totalExpired).toBe(3);
    expect(result.batchCount).toBe(1);
    expect(notify).toHaveBeenCalledTimes(6);
    // Cada quote genera un in_app y un email_simulated.
    const channels = notify.mock.calls.map((c) => c[0]!.channel).sort();
    expect(channels.filter((c) => c === 'in_app')).toHaveLength(3);
    expect(channels.filter((c) => c === 'email_simulated')).toHaveLength(3);
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    // Emite `quote.expired.batch` una vez.
    const batchEmits = emit.mock.calls.filter((c) => c[0] === 'quote.expired.batch');
    expect(batchEmits).toHaveLength(1);
    expect(batchEmits[0]?.[1]).toMatchObject({ batchIndex: 0, count: 3 });
  });

  it('batching de 250 con batchSize=100 requiere 3 iteraciones (100+100+50)', async () => {
    const batchA = Array.from({ length: 100 }, (_, i) => makeCandidate(`a${i}`));
    const batchB = Array.from({ length: 100 }, (_, i) => makeCandidate(`b${i}`));
    const batchC = Array.from({ length: 50 }, (_, i) => makeCandidate(`c${i}`));
    const { uc, notify, emit } = makeUc([batchA, batchB, batchC, []]);
    const result = await uc.execute({ batchSize: 100, correlationId: 'corr', runId: 'run' });
    expect(result.totalExpired).toBe(250);
    expect(result.batchCount).toBe(3);
    expect(notify).toHaveBeenCalledTimes(250 * 2);
    const batchEmits = emit.mock.calls.filter((c) => c[0] === 'quote.expired.batch');
    expect(batchEmits).toHaveLength(3);
  });

  it('EC-04 fallo de batch: corta el loop, registra .batch.failed y devuelve errors[]', async () => {
    const batch = [makeCandidate('q1')];
    const { uc, emit } = makeUc([batch], { throwOnBatch: 0 });
    const result = await uc.execute({ correlationId: 'corr', runId: 'run' });
    expect(result.totalExpired).toBe(0);
    expect(result.batchCount).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.message).toContain('simulated batch failure');
    expect(emit).toHaveBeenCalledWith(
      'quote.expired.batch.failed',
      expect.objectContaining({ batchIndex: 0 }),
    );
  });

  it('re-run inmediato es idempotente: segundo run con 0 candidatos ⇒ totalExpired=0', async () => {
    const { uc } = makeUc([[]]);
    const r1 = await uc.execute({});
    const r2 = await uc.execute({});
    expect(r1.totalExpired).toBe(0);
    expect(r2.totalExpired).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExpireQuotesJob (BE-002)
// ─────────────────────────────────────────────────────────────────────────────
describe('US-053 · ExpireQuotesJob', () => {
  function makeJob(overrides: {
    ucExecute?: () => Promise<unknown>;
    jitterMaxMs?: number;
    randomValue?: number;
  } = {}) {
    const emit = vi.fn();
    const clock: ClockPort = { now: () => new Date(Date.UTC(2026, 6, 16, 0, 0, 0)) };
    const useCase = {
      execute: overrides.ucExecute ?? (async () => ({ totalExpired: 0, batchCount: 0, durationMs: 0, errors: [] })),
    } as unknown as ExpireQuotesUs053UseCase;
    const waitMock = vi.fn(async () => {});
    const job = new ExpireQuotesJob(
      {
        useCase,
        clock,
        logger: { emit },
        cadence: '5 0 * * *',
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
      'quote.expired.run.start',
      expect.objectContaining({ correlationId: 'job-test-run-id', runId: 'test-run-id', jitterMs: 0 }),
    );
    expect(waitMock).not.toHaveBeenCalled();
  });

  it('con jitterMaxMs > 0 aplica el jitter usando el random inyectado', async () => {
    const { job, emit, waitMock } = makeJob({ jitterMaxMs: 10000, randomValue: 0.5 });
    await job.run();
    expect(waitMock).toHaveBeenCalledWith(5000);
    expect(emit).toHaveBeenCalledWith(
      'quote.expired.run.start',
      expect.objectContaining({ jitterMs: 5000 }),
    );
  });

  it('excepción del useCase se absorbe y emite quote.expired.run.failed', async () => {
    const boom = async () => {
      throw new Error('boom');
    };
    const { job, emit } = makeJob({ ucExecute: boom });
    await expect(job.run()).resolves.toBeUndefined();
    expect(emit).toHaveBeenCalledWith(
      'quote.expired.run.failed',
      expect.objectContaining({ correlationId: 'job-test-run-id', reason: 'boom' }),
    );
  });
});

