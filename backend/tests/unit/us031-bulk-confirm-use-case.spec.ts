// US-031 (PB-P1-017) / QA-001 — Unit tests del use case bulk confirm HITL.
// Verifica dedup (AC-03/EC-01), validación defensiva del límite (EC-07), ownership + no-revelación
// (EC-02), evento no mutable (EC-09), agregación happy path (AC-01) y éxito parcial controlado
// (AC-02), preservando la semántica de éxito parcial NO all-or-nothing (decisión PO PB-P1-017).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmAITasksBulkUseCase } from '../../src/modules/task-management/bulk-confirm/application/confirm-ai-tasks-bulk.use-case.js';
import { BulkConfirmTelemetry } from '../../src/modules/task-management/bulk-confirm/application/bulk-confirm-telemetry.js';
import {
  BulkLimitExceededError,
  EventNotMutableError,
} from '../../src/modules/task-management/bulk-confirm/domain/errors/bulk-confirm.errors.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import type { AITaskBulkRepository } from '../../src/modules/task-management/bulk-confirm/ports/ai-task-bulk.repository.js';
import type { OwnedEventMutabilityReader } from '../../src/modules/task-management/bulk-confirm/ports/owned-event-mutability.reader.js';

const EVENT_ID = '11111111-1111-1111-1111-111111111111';
const ACTOR_ID = '22222222-2222-2222-2222-222222222222';

function buildRepo(overrides: Partial<AITaskBulkRepository> = {}): AITaskBulkRepository {
  return {
    confirmConditional: vi.fn(async () => ({ accepted: true as const })),
    ...overrides,
  };
}

function buildReader(overrides: Partial<OwnedEventMutabilityReader> = {}): OwnedEventMutabilityReader {
  return {
    find: vi.fn(async () => ({
      id: EVENT_ID,
      status: 'active' as const,
      mutable: true,
    })),
    ...overrides,
  };
}

function u(idx: number): string {
  return `${idx.toString().padStart(8, '0')}-0000-4000-8000-000000000000`;
}

describe('ConfirmAITasksBulkUseCase — US-031', () => {
  let telemetry: BulkConfirmTelemetry;

  beforeEach(() => {
    telemetry = new BulkConfirmTelemetry();
  });

  it('AC-01 happy path: confirma todos los ítems y agrega summary', async () => {
    const repo = buildRepo();
    const reader = buildReader();
    const uc = new ConfirmAITasksBulkUseCase(repo, reader, telemetry);
    const taskIds = [u(1), u(2), u(3)];

    const result = await uc.execute({
      actor: { id: ACTOR_ID, role: 'organizer' },
      eventId: EVENT_ID,
      taskIds,
      correlationId: 'c-1',
    });

    expect(result.summary).toEqual({ requested: 3, deduped: 0, accepted: 3, rejected: 0 });
    expect(result.results).toHaveLength(3);
    for (const r of result.results) expect(r.accepted).toBe(true);
    expect(repo.confirmConditional).toHaveBeenCalledTimes(3);
  });

  it('AC-02 partial success: mezcla aceptados y rechazados sin rollback global', async () => {
    const repo = buildRepo({
      confirmConditional: vi.fn(async ({ taskId }) => {
        if (taskId === u(2)) return { accepted: false as const, code: 'TASK_NOT_PENDING' as const };
        if (taskId === u(3)) return { accepted: false as const, code: 'TASK_NOT_AI' as const };
        return { accepted: true as const };
      }),
    });
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);

    const result = await uc.execute({
      actor: { id: ACTOR_ID, role: 'organizer' },
      eventId: EVENT_ID,
      taskIds: [u(1), u(2), u(3)],
    });

    expect(result.summary).toEqual({ requested: 3, deduped: 0, accepted: 1, rejected: 2 });
    expect(result.results[0]).toEqual({ taskId: u(1), accepted: true });
    expect(result.results[1]?.error?.code).toBe('TASK_NOT_PENDING');
    expect(result.results[2]?.error?.code).toBe('TASK_NOT_AI');
  });

  it('AC-03 / EC-01 dedup silencioso: no duplica entradas ni cuenta duplicados como rechazos', async () => {
    const repo = buildRepo();
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);

    const result = await uc.execute({
      actor: { id: ACTOR_ID, role: 'organizer' },
      eventId: EVENT_ID,
      taskIds: [u(1), u(1), u(2), u(2), u(3)],
    });

    expect(result.summary).toEqual({ requested: 5, deduped: 2, accepted: 3, rejected: 0 });
    expect(result.results.map((r) => r.taskId)).toEqual([u(1), u(2), u(3)]);
    expect(repo.confirmConditional).toHaveBeenCalledTimes(3);
  });

  it('AC-05 idempotencia: segundo request marca todos como TASK_NOT_PENDING sin error global', async () => {
    const repo = buildRepo({
      confirmConditional: vi.fn(async () => ({ accepted: false as const, code: 'TASK_NOT_PENDING' as const })),
    });
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);

    const result = await uc.execute({
      actor: { id: ACTOR_ID, role: 'organizer' },
      eventId: EVENT_ID,
      taskIds: [u(1), u(2)],
    });

    expect(result.summary.accepted).toBe(0);
    expect(result.summary.rejected).toBe(2);
    for (const r of result.results) expect(r.error?.code).toBe('TASK_NOT_PENDING');
  });

  it('EC-07 límite 50 tras dedup: 51 IDs únicos → BulkLimitExceededError', async () => {
    const repo = buildRepo();
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);
    const taskIds = Array.from({ length: 51 }, (_, i) => u(i + 1));

    await expect(
      uc.execute({
        actor: { id: ACTOR_ID, role: 'organizer' },
        eventId: EVENT_ID,
        taskIds,
      }),
    ).rejects.toBeInstanceOf(BulkLimitExceededError);
    expect(repo.confirmConditional).not.toHaveBeenCalled();
  });

  it('EC-02 evento ajeno: reader retorna null → NotFoundError global sin tocar tareas', async () => {
    const repo = buildRepo();
    const reader = buildReader({ find: vi.fn(async () => null) });
    const uc = new ConfirmAITasksBulkUseCase(repo, reader, telemetry);

    await expect(
      uc.execute({
        actor: { id: ACTOR_ID, role: 'organizer' },
        eventId: EVENT_ID,
        taskIds: [u(1)],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.confirmConditional).not.toHaveBeenCalled();
  });

  it('EC-09 evento no mutable: reader devuelve mutable=false → EventNotMutableError sin procesar', async () => {
    const repo = buildRepo();
    const reader = buildReader({
      find: vi.fn(async () => ({
        id: EVENT_ID,
        status: 'cancelled' as const,
        mutable: false,
        immutableReason: 'cancelled' as const,
      })),
    });
    const uc = new ConfirmAITasksBulkUseCase(repo, reader, telemetry);

    await expect(
      uc.execute({
        actor: { id: ACTOR_ID, role: 'organizer' },
        eventId: EVENT_ID,
        taskIds: [u(1)],
      }),
    ).rejects.toBeInstanceOf(EventNotMutableError);
    expect(repo.confirmConditional).not.toHaveBeenCalled();
  });

  it('EC-08 body vacío defensivo: taskIds=[] arroja BulkLimitExceededError(received=0)', async () => {
    // Normalmente Zod (min(1)) atrapa este caso; el use case defiende un flujo interno sin schema.
    const repo = buildRepo();
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);

    await expect(
      uc.execute({ actor: { id: ACTOR_ID, role: 'organizer' }, eventId: EVENT_ID, taskIds: [] }),
    ).rejects.toBeInstanceOf(BulkLimitExceededError);
  });

  it('telemetría: emite requested + succeeded en happy path (0 rejected)', async () => {
    const uc = new ConfirmAITasksBulkUseCase(buildRepo(), buildReader(), telemetry);
    await uc.execute({ actor: { id: ACTOR_ID, role: 'organizer' }, eventId: EVENT_ID, taskIds: [u(1)] });

    const snap = telemetry.snapshot();
    expect(snap.totals.success).toBe(1);
    expect(snap.totals.partial).toBe(0);
    expect(snap.acceptedTotal).toBe(1);
  });

  it('telemetría: emite requested + partial_failed y contabiliza por error_code cuando hay rejects', async () => {
    const repo = buildRepo({
      confirmConditional: vi.fn(async ({ taskId }) =>
        taskId === u(1)
          ? { accepted: true as const }
          : { accepted: false as const, code: 'TASK_NOT_IN_EVENT' as const },
      ),
    });
    const uc = new ConfirmAITasksBulkUseCase(repo, buildReader(), telemetry);
    await uc.execute({
      actor: { id: ACTOR_ID, role: 'organizer' },
      eventId: EVENT_ID,
      taskIds: [u(1), u(2)],
    });

    const snap = telemetry.snapshot();
    expect(snap.totals.partial).toBe(1);
    expect(snap.rejectedByCode.TASK_NOT_IN_EVENT).toBe(1);
  });
});
