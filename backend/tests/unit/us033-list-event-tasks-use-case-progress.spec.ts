// US-033 (PB-P1-019 / QA-001) — Unit tests del use case con `calculateProgress` mockeado.
// Cobertura:
//   - Composición del response `{ items, pagination, progress }` (AC-01, AC-03).
//   - `total_countable = 0 ⇒ percentage = 0` (EC-01/02/03).
//   - Independencia del cálculo respecto a `range`, `page`, `pageSize` (D1).
//   - Telemetría `tasks.list.requested` incluye `progress.*` sin PII (OBS-001, SEC-05).
import { describe, it, expect, vi } from 'vitest';
import { ListEventTasksUseCase } from '../../src/modules/task-management/list/application/list-event-tasks.use-case.js';
import { ListEventTasksTelemetry } from '../../src/modules/task-management/list/application/list-event-tasks-telemetry.js';
import type {
  EventTaskListRepository,
  PaginatedTaskRows,
} from '../../src/modules/task-management/list/ports/event-task-list.repository.js';
import type { EventTaskProgressDto } from '../../src/modules/task-management/list/application/dtos/event-task-progress.dto.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

const EVENT_ID = '00000000-0000-4000-8000-000000000001';
const OWNER_ID = '00000000-0000-4000-8000-000000000002';

function fakeRepo(progress: EventTaskProgressDto, items: PaginatedTaskRows['items'] = []): EventTaskListRepository {
  const paginated: PaginatedTaskRows = {
    items,
    total: items.length,
    today: new Date('2026-08-15T00:00:00.000Z'),
  };
  return {
    isOwnedEvent: vi.fn(async () => true),
    findByEventPaginated: vi.fn(async () => paginated),
    calculateProgress: vi.fn(async () => progress),
  };
}

describe('US-033 ListEventTasksUseCase — composición de progress (BE-002)', () => {
  it('AC-01/AC-03: retorna `progress` en el resultado con el shape canónico', async () => {
    const progress: EventTaskProgressDto = {
      percentage: 75,
      done: 6,
      total_countable: 8,
      skipped: 2,
    };
    const repo = fakeRepo(progress);
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    const result = await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 1, pageSize: 20 },
      filtersDropped: [],
      correlationId: 'corr-1',
    });
    expect(result.progress).toEqual(progress);
  });

  it('EC-01: `total_countable = 0` ⇒ `percentage = 0` (mock del repo)', async () => {
    const repo = fakeRepo({ percentage: 0, done: 0, total_countable: 0, skipped: 0 });
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    const result = await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 1, pageSize: 20 },
      filtersDropped: [],
      correlationId: 'corr-2',
    });
    expect(result.progress.percentage).toBe(0);
    expect(result.progress.total_countable).toBe(0);
  });

  it('D1: `calculateProgress` NO recibe `range` ni pagination (independiente del listado)', async () => {
    const repo = fakeRepo({ percentage: 50, done: 5, total_countable: 10, skipped: 3 });
    const spy = repo.calculateProgress as ReturnType<typeof vi.fn>;
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'overdue', rangeDropped: false },
      pagination: { page: 3, pageSize: 5 },
      filtersDropped: [],
      correlationId: 'corr-3',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    // El único argumento del método es `eventId` — no se pasan filtros ni paginación.
    expect(spy.mock.calls[0]).toEqual([EVENT_ID]);
  });

  it('OBS-001/SEC-05: telemetría incluye `progress.*` sin PII (sólo enteros)', async () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const repo = fakeRepo({ percentage: 40, done: 4, total_countable: 10, skipped: 1 });
    const uc = new ListEventTasksUseCase(repo, new ListEventTasksTelemetry());
    await uc.execute({
      actorId: OWNER_ID,
      eventId: EVENT_ID,
      filters: { range: 'all', rangeDropped: false },
      pagination: { page: 1, pageSize: 20 },
      filtersDropped: [],
      correlationId: 'corr-4',
    });
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.event).toBe('tasks.list.requested');
    const progress = payload.progress as Record<string, number>;
    expect(progress).toEqual({ percentage: 40, done: 4, total_countable: 10, skipped: 1 });
    // Nunca se loguean títulos/descripciones de tareas (SEC-05).
    expect(JSON.stringify(payload)).not.toContain('title');
    spy.mockRestore();
  });
});
