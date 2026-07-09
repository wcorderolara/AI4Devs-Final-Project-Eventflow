// ListMyEventsUseCase (US-095 / BE-004). AC-02. Devuelve SOLO eventos del organizer actual
// (owner-scoped en la query del repo, no post-processing — SEC-002), con filtros y paginación.
import type { EventRepository } from '../ports/event.repository.js';
import type { EventView } from '../domain/event.js';
import type { ListEventsQuery } from '../dto/index.js';

export interface ListMyEventsResult {
  items: EventView[];
  page: number;
  pageSize: number;
  total: number;
}

export class ListMyEventsUseCase {
  constructor(private readonly events: EventRepository) {}

  async execute(ownerId: string, query: ListEventsQuery): Promise<ListMyEventsResult> {
    const { items, total } = await this.events.listByOwner(
      ownerId,
      {
        status: query.status,
        eventTypeCode: query.eventTypeCode,
        eventDateFrom: query.eventDateFrom,
        eventDateTo: query.eventDateTo,
      },
      { page: query.page, pageSize: query.pageSize, sort: query.sort },
    );
    return { items, page: query.page, pageSize: query.pageSize, total };
  }
}
