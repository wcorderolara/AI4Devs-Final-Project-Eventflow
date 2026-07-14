// US-027 (PB-P1-018 / FE-001) — Tipos del cliente API del listado de tareas.
// Espeja el DTO canónico del backend `TaskListItemDto` y `pagination` del envelope.
export type TaskListItemStatus =
  | 'pending'
  | 'active'
  | 'in_progress'
  | 'done'
  | 'skipped';

export interface TaskListItemDTO {
  id: string;
  title: string;
  due_date: string | null;
  status: TaskListItemStatus;
  category_code: string | null;
  ai_generated: boolean;
  ai_recommendation_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // US-032 (PB-P1-019 / FE-003) — Flags derivados server-side. Consumidos por `TaskListItem`
  // para renderizar badges `Vencido` / `Próximo a vencer`. NO opcionales en el contrato.
  overdue: boolean;
  is_t_minus_7: boolean;
}

export interface TaskListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// US-033 (PB-P1-019 / BE-003) — Agregado server-side del progreso (D2/D4).
// `percentage` es entero half-up en `[0,100]`; `done`, `total_countable`, `skipped` son
// enteros ≥ 0. Siempre presente en respuestas 200 (incluso `{0,0,0,0}` sin tareas — EC-01).
// La UI NO recalcula (VR-04); sólo formatea.
export interface TaskProgressDTO {
  percentage: number;
  done: number;
  total_countable: number;
  skipped: number;
}

export interface TaskListEnvelopeDTO {
  data: TaskListItemDTO[];
  pagination: TaskListPaginationMeta;
  // US-033: campo aditivo del envelope canónico. El backend lo emite como sibling de `data`.
  progress?: TaskProgressDTO;
  meta: { correlationId: string; timestamp: string };
}

export interface TaskListResult {
  items: TaskListItemDTO[];
  pagination: TaskListPaginationMeta;
  // US-033 (FE-003): siempre presente para respuestas 200 del endpoint canónico. Opcional en
  // el tipo TS por retro-compat con handlers de mock que no emiten `progress`.
  progress?: TaskProgressDTO;
}

// US-032 (PB-P1-019 / FE-001) — Rangos temporales del segmented control (default `all`).
export const TASK_LIST_RANGES = ['overdue', '7d', '30d', 'all'] as const;
export type TaskListRange = (typeof TASK_LIST_RANGES)[number];
export const DEFAULT_TASK_LIST_RANGE: TaskListRange = 'all';

export interface ListTasksParams {
  eventId: string;
  status?: TaskListItemStatus;
  aiGenerated?: boolean;
  categoryCode?: string;
  // US-032: rango temporal opcional. Cuando es `undefined` no se envía al backend, que
  // aplica el default server-side (`all`) — mismo comportamiento que el segmented control.
  range?: TaskListRange;
  page?: number;
  pageSize?: number;
}
