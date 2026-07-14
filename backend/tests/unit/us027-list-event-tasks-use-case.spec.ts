// US-027 (PB-P1-018) / QA-001 — Unit tests del use case con repositorio mockeado.
// Cubre: masked 404 cuando el evento no está ownership (AUTH-TS-02, EC-06), envelope de
// paginación consistente y emisión del log `tasks.list.requested` con `filtersDropped`.
import { describe, it, expect, vi } from 'vitest';
import { ListEventTasksUseCase } from '../../src/modules/task-management/list/application/list-event-tasks.use-case.js';
import { ListEventTasksTelemetry } from '../../src/modules/task-management/list/application/list-event-tasks-telemetry.js';
import type {
  EventTaskListRepository,
  EventTaskRow,
  PaginatedTaskRows,
} from '../../src/modules/task-management/list/ports/event-task-list.repository.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';

const EVENT_ID = '00000000-0000-4000-8000-000000000001';
const OWNER_ID = '00000000-0000-4000-8000-000000000002';
const OTHER_ID = '00000000-0000-4000-8000-000000000003';

function fakeRepo(overrides: Partial<EventTaskListRepository> = {}): EventTaskListRepository {
  const row: EventTaskRow = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Reservar salón',
    dueDate: new Date('2026-09-01T00:00:00.000Z'),
    status: 'pending',
    categoryCode: null,
    aiGenerated: false,
    aiRecommendationId: null,
    confirmedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
  };
  const defaultRows: PaginatedTaskRows = {
    items: [row],
    total: 1,
    today: new Date('2026-08-15T00:00:00.000Z'),
  };
  return {
    isOwnedEvent: overrides.isOwnedEvent ?? vi.fn(async () => true),
    findByEventPaginated: overrides.findByEventPaginated ?? vi.fn(async () => defaultRows),
    // US-033 (BE-002): el use case invoca `calculateProgress` en paralelo con el listado.
    calculateProgress:
      overrides.calculateProgress ??
      vi.fn(async () => ({ percentage: 0, done: 0, total_countable: 0, skipped: 0 })),
  };
}

describe('US-027 ListEventTasksUseCase', () => {
  it('happy: retorna items mapeados + paginación', async () => {
    const repo = fakeRepo();
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    const result = await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 1, pageSize: 20 },
      filtersDropped: [],
      correlationId: 'corr-1',
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('ownership falso → NotFoundError (masked 404, AUTH-TS-02)', async () => {
    const repo = fakeRepo({ isOwnedEvent: vi.fn(async () => false) });
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    await expect(
      uc.execute({
        actorId: OTHER_ID,
        eventId: EVENT_ID,
        filters: { range: 'all', rangeDropped: false },
        pagination: { page: 1, pageSize: 20 },
        filtersDropped: [],
        correlationId: 'corr-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('emite telemetría con filtersDropped al descartar filtros inválidos (EC-01)', async () => {
    const repo = fakeRepo({
      findByEventPaginated: vi.fn(async () => ({
        items: [],
        total: 0,
        today: new Date('2026-08-15T00:00:00.000Z'),
      })),
    });
    const telemetry = new ListEventTasksTelemetry();
    const spy = vi.spyOn(telemetry, 'emitRequested');
    const uc = new ListEventTasksUseCase(repo, telemetry);
    await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 1, pageSize: 20 },
      filtersDropped: [{ key: 'status', value: 'foo', reason: 'not_in_enum' }],
      correlationId: 'corr-3',
    });
    expect(spy).toHaveBeenCalledOnce();
    const evt = spy.mock.calls[0]![0];
    expect(evt.filtersDropped).toEqual([
      { key: 'status', value: 'foo', reason: 'not_in_enum' },
    ]);
    expect(evt.itemsCount).toBe(0);
    expect(evt.totalItems).toBe(0);
    expect(evt.statusCode).toBe(200);
  });

  it('pagina con page=2, pageSize=50 y preserva total', async () => {
    const repo = fakeRepo({
      findByEventPaginated: vi.fn(async () => ({
        items: [],
        total: 200,
        today: new Date('2026-08-15T00:00:00.000Z'),
      })),
    });
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    const result = await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 2, pageSize: 50 },
      filtersDropped: [],
      correlationId: 'corr-4',
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
    expect(result.total).toBe(200);
  });
});
