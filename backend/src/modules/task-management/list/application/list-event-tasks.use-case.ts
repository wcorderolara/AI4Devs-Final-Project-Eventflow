// US-027 (PB-P1-018 / BE-004) — Use case orquestador del listado paginado.
// Flujo: ownership (masked 404) → repositorio (findMany + count) → mapper → resultado paginado.
// Emite `tasks.list.requested` con `filtersDropped` (EC-01, SEC-04). SIN transacciones de mutación,
// SIN invocación al LLM. La respuesta HTTP final se serializa en el controller con `success()`.
//
// US-032 (PB-P1-019 / BE-005) — Cambio aditivo: recibe `filters.range` (ya normalizado por el
// parser, siempre presente) y lo propaga al repositorio. Reusa íntegramente el pipeline de
// autorización de US-027 (ownership + role guard + no-revelación 404); no introduce policies
// nuevas ni cambia la firma pública del controller.
//
// US-033 (PB-P1-019 / BE-002) — Cambio aditivo: tras paginar los items, invoca
// `repo.calculateProgress(eventId)` (agregado sobre el UNIVERSO completo de tareas del evento —
// independiente de `range`/`page`/`pageSize`, D1) y compone `{ items, pagination, progress }`.
// El cálculo no consulta `event.status` (D3): la autorización ocurre en el ownership guard;
// el agregado se computa igual para `draft`/`active`/`cancelled`/`completed`.
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import type { EventTaskListRepository } from '../ports/event-task-list.repository.js';
import { toTaskListItemDtoList } from '../infrastructure/mappers/task-list-item.mapper.js';
import type { ListEventTasksResult } from './dtos/list-event-tasks-response.dto.js';
import type {
  FilterDrop,
  ListEventTasksFilters,
  ListEventTasksPagination,
} from '../interface/http/list-event-tasks.schema.js';
import { ListEventTasksTelemetry } from './list-event-tasks-telemetry.js';

export interface ListEventTasksInput {
  actorId: string;
  eventId: string;
  filters: ListEventTasksFilters;
  pagination: ListEventTasksPagination;
  filtersDropped: FilterDrop[];
  correlationId: string;
}

export class ListEventTasksUseCase {
  constructor(
    private readonly repo: EventTaskListRepository,
    private readonly telemetry: ListEventTasksTelemetry = new ListEventTasksTelemetry(),
  ) {}

  async execute(input: ListEventTasksInput): Promise<ListEventTasksResult> {
    const startedAt = Date.now();
    const owned = await this.repo.isOwnedEvent(input.eventId, input.actorId);
    if (!owned) {
      // Masked 404 (SEC-06 / AUTH-TS-02): evento ajeno, inexistente o soft-deleted colapsan
      // en el mismo error para no revelar existencia de recursos.
      throw new NotFoundError('Resource not found');
    }

    // US-033 (BE-002): listado paginado y agregado de progreso en paralelo — ambos son lecturas
    // sin dependencia mutua (D1: `progress` NO depende de `range`/`page`/`pageSize`).
    const [paginated, progress] = await Promise.all([
      this.repo.findByEventPaginated(input.eventId, input.filters, input.pagination),
      this.repo.calculateProgress(input.eventId),
    ]);
    const { items, total, today } = paginated;

    // US-032 (BE-005): `today` viene del repositorio (server-side CURRENT_DATE); el mapper lo
    // usa para derivar `overdue`/`is_t_minus_7` con la misma referencia temporal del WHERE.
    const dtoItems = toTaskListItemDtoList(items, today);
    const result: ListEventTasksResult = {
      items: dtoItems,
      page: input.pagination.page,
      pageSize: input.pagination.pageSize,
      total,
      progress,
    };

    this.telemetry.emitRequested({
      correlationId: input.correlationId,
      actorId: input.actorId,
      eventId: input.eventId,
      filtersApplied: input.filters,
      filtersDropped: input.filtersDropped,
      page: input.pagination.page,
      pageSize: input.pagination.pageSize,
      itemsCount: dtoItems.length,
      totalItems: total,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      progress,
    });

    return result;
  }
}
