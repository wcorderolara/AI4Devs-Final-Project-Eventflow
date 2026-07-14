// US-027 (PB-P1-018 / BE-002) — Port de lectura paginada del checklist.
// Devuelve filas planas (sin entidad de dominio) para evitar over-fetching. El repositorio
// Prisma se encarga de aplicar `deleted_at IS NULL`, filtros opcionales y ordenamiento canónico.
//
// US-033 (PB-P1-019 / BE-001) — Extensión con `calculateProgress`: agregado server-side de
// `% done` sobre el UNIVERSO completo de tareas del evento (D1: no depende de `range`, `page`
// ni `pageSize` del listado). Se ejecuta como una única query SQL `COUNT(*) FILTER (...)`
// (VR-04 + AC-06 NFR-PERF-001). Reusa `idx_event_tasks_event_status_due`.
import type { ListEventTasksFilters, ListEventTasksPagination } from '../interface/http/list-event-tasks.schema.js';
import type { EventTaskProgressDto } from '../application/dtos/event-task-progress.dto.js';

export interface EventTaskRow {
  id: string;
  title: string;
  dueDate: Date | null;
  status: 'pending' | 'active' | 'in_progress' | 'done' | 'skipped';
  categoryCode: string | null;
  aiGenerated: boolean;
  aiRecommendationId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedTaskRows {
  items: EventTaskRow[];
  total: number;
  // US-032 (PB-P1-019 / BE-004) — `CURRENT_DATE` evaluado server-side por el repositorio y
  // reutilizado por el mapper para derivar `overdue`/`is_t_minus_7`. Un único valor por request
  // garantiza que las cláusulas `WHERE` (rango) y el cálculo de flags observen el mismo "hoy".
  today: Date;
}

export interface EventTaskListRepository {
  /** Valida ownership. `true` sii el evento existe, pertenece al owner y NO está soft-deleted. */
  isOwnedEvent(eventId: string, ownerId: string): Promise<boolean>;

  findByEventPaginated(
    eventId: string,
    filters: ListEventTasksFilters,
    pagination: ListEventTasksPagination,
  ): Promise<PaginatedTaskRows>;

  /**
   * US-033 (PB-P1-019 / BE-001) — Agregado server-side del progreso del checklist.
   * Devuelve `{ percentage, done, total_countable, skipped }` con:
   *   - `percentage = ROUND_HALF_UP(done / total_countable * 100)` si `total_countable > 0`,
   *     `0` en caso contrario (D2/D4).
   *   - `total_countable` = tareas contables con `status IN ('pending','active','in_progress','done')`.
   *   - `done` = tareas contables con `status = 'done'`.
   *   - `skipped` = tareas contables con `status = 'skipped'` (auditoría, no entra al denominador).
   *   - "Tarea contable" = `deleted_at IS NULL AND (ai_generated = false OR (ai_generated = true
   *     AND confirmed_at IS NOT NULL))` — HITL (FR-TASK-005 / BR-TASK-003 / US-031).
   * Independiente de `event.status` (D3) y de filtros/paginación del listado (D1).
   */
  calculateProgress(eventId: string): Promise<EventTaskProgressDto>;
}
