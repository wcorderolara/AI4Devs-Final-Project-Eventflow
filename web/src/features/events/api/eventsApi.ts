import {
  type Envelope,
  httpDelete,
  httpGet,
  httpGetData,
  httpPatchData,
  httpPostData,
} from '@/shared/api-client';
import type {
  CreateEventRequestDTO,
  EventListResult,
  EventModel,
  EventTypeOption,
  ListEventsParams,
  LocationOption,
  PaginationMeta,
  UpdateEventRequestDTO,
} from './eventsApi.types';

/**
 * API client de la feature events (US-009..US-014). Todas las operaciones son owner-scoped en el
 * backend (identidad de la sesión, cookie HTTP-only vía `credentials: 'include'`). Nunca se envía
 * ownerId. `GET /events` filtra por `status`/`eventTypeCode` y pagina server-side (US-013).
 */
export const eventsApi = {
  /** US-013 / AC-02: listado paginado y filtrado de eventos propios. */
  async list(params: ListEventsParams = {}): Promise<EventListResult> {
    const dto = await httpGet<Envelope<EventModel[]> & { pagination: PaginationMeta }>('/events', {
      query: {
        status: params.status,
        eventTypeCode: params.eventTypeCode,
        eventDateFrom: params.eventDateFrom,
        eventDateTo: params.eventDateTo,
        page: params.page,
        pageSize: params.pageSize,
        sort: params.sort,
      },
    });
    return { items: dto.data, pagination: dto.pagination };
  },

  /** US-014 / AC-01: detalle de un evento propio. */
  async getById(eventId: string): Promise<EventModel> {
    return httpGetData<EventModel>(`/events/${eventId}`);
  },

  /** US-009 / AC-01: crear evento (queda en `draft`). */
  async create(input: CreateEventRequestDTO): Promise<EventModel> {
    return httpPostData<EventModel, CreateEventRequestDTO>('/events', { body: input });
  },

  /** US-010 / AC-04: editar campos permitidos (currency inmutable). */
  async update(eventId: string, input: UpdateEventRequestDTO): Promise<EventModel> {
    return httpPatchData<EventModel, UpdateEventRequestDTO>(`/events/${eventId}`, { body: input });
  },

  /** US-011 / AC-07: cancelar evento no terminal. */
  async cancel(eventId: string): Promise<EventModel> {
    return httpPostData<EventModel, Record<string, never>>(`/events/${eventId}/cancel`, {
      body: {},
    });
  },

  /** US-012 / AC-01: soft delete de un borrador. 204 sin body. */
  async remove(eventId: string): Promise<void> {
    await httpDelete<void>(`/events/${eventId}`);
  },

  /** US-009 / AC-02: catálogo de tipos de evento activos. */
  async listEventTypes(): Promise<EventTypeOption[]> {
    return httpGetData<EventTypeOption[]>('/event-types');
  },

  /** US-009: catálogo de ubicaciones disponibles. */
  async listLocations(): Promise<LocationOption[]> {
    return httpGetData<LocationOption[]>('/locations');
  },
};
