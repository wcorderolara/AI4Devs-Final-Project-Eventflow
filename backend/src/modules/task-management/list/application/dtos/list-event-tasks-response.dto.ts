// US-027 (PB-P1-018 / BE-001) — Response DTO del listado paginado. El envelope real de la
// respuesta HTTP añade `{ data, pagination, meta }` vía `success()` (US-093); esta interfaz
// modela solo el contenido interno que el use case retorna al controller.
//
// US-033 (PB-P1-019 / BE-003) — El use case ahora también compone el agregado `progress`
// (D1/D4) que el controller inyectará como campo aditivo del envelope canónico.
import type { TaskListItemDto } from './task-list-item.dto.js';
import type { EventTaskProgressDto } from './event-task-progress.dto.js';

export interface ListEventTasksResult {
  items: TaskListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  progress: EventTaskProgressDto;
}
