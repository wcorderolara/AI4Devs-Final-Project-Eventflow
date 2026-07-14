// US-027 (PB-P1-018 / OBS-001) — Telemetría del endpoint de listado.
// Emite un log estructurado `tasks.list.requested` con `filtersDropped` (EC-01) y campos sin
// PII (SEC-07: nunca se loguea `title`/`description`). Las métricas Prometheus quedan como
// helper explícito para conectar al registro central si existe.
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import type { FilterDrop, ListEventTasksFilters } from '../interface/http/list-event-tasks.schema.js';
import type { EventTaskProgressDto } from './dtos/event-task-progress.dto.js';

export interface TasksListRequestedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  filtersApplied: ListEventTasksFilters;
  filtersDropped: FilterDrop[];
  page: number;
  pageSize: number;
  itemsCount: number;
  totalItems: number;
  latencyMs: number;
  statusCode: number;
  // US-033 (PB-P1-019 / OBS-001) — Agregado embebido en el log estructurado (SEC-05 sin PII;
  // sólo enteros). Auditoría del cálculo canónico correlacionable por `correlationId`.
  progress: EventTaskProgressDto;
}

export class ListEventTasksTelemetry {
  emitRequested(evt: TasksListRequestedEvent): void {
    logger.info({
      event: 'tasks.list.requested',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      filtersApplied: evt.filtersApplied,
      filtersDropped: evt.filtersDropped,
      // US-032 (PB-P1-019 / OBS-001) — campos dedicados para el filtro temporal.
      // `range_filter` es siempre uno de los 4 enums (post-tolerancia); `range_dropped=true`
      // cuando el cliente envió un valor inválido descartado (EC-01). El detalle del descarte
      // ya vive en `filtersDropped` con `key='range'` (SEC-06: sin PII).
      range_filter: evt.filtersApplied.range,
      range_dropped: evt.filtersApplied.rangeDropped,
      page: evt.page,
      pageSize: evt.pageSize,
      itemsCount: evt.itemsCount,
      totalItems: evt.totalItems,
      latencyMs: evt.latencyMs,
      statusCode: evt.statusCode,
      // US-033 (PB-P1-019 / OBS-001) — sólo enteros; sin PII (SEC-05).
      progress: {
        percentage: evt.progress.percentage,
        done: evt.progress.done,
        total_countable: evt.progress.total_countable,
        skipped: evt.progress.skipped,
      },
    });
  }
}
