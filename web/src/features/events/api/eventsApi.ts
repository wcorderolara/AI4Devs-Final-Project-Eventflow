import { httpDelete, httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  CreateEventRequestDTO,
  EventEnvelopeDTO,
  EventListEnvelopeDTO,
  EventListResult,
  EventModel,
  EventTypeOption,
  EventTypesEnvelopeDTO,
  ListEventsParams,
  LocationOption,
  LocationsEnvelopeDTO,
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
    const dto = await httpGet<EventListEnvelopeDTO>('/events', {
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
    const dto = await httpGet<EventEnvelopeDTO>(`/events/${eventId}`);
    return dto.data;
  },

  /** US-009 / AC-01: crear evento (queda en `draft`). */
  async create(input: CreateEventRequestDTO): Promise<EventModel> {
    const dto = await httpPost<EventEnvelopeDTO, CreateEventRequestDTO>('/events', { body: input });
    return dto.data;
  },

  /** US-010 / AC-04: editar campos permitidos (currency inmutable). */
  async update(eventId: string, input: UpdateEventRequestDTO): Promise<EventModel> {
    const dto = await httpPatch<EventEnvelopeDTO, UpdateEventRequestDTO>(`/events/${eventId}`, {
      body: input,
    });
    return dto.data;
  },

  /** US-011 / AC-07: cancelar evento no terminal. */
  async cancel(eventId: string): Promise<EventModel> {
    const dto = await httpPost<EventEnvelopeDTO, Record<string, never>>(
      `/events/${eventId}/cancel`,
      { body: {} },
    );
    return dto.data;
  },

  /** US-012 / AC-01: soft delete de un borrador. 204 sin body. */
  async remove(eventId: string): Promise<void> {
    await httpDelete<void>(`/events/${eventId}`);
  },

  /** US-009 / AC-02: catálogo de tipos de evento activos. */
  async listEventTypes(): Promise<EventTypeOption[]> {
    const dto = await httpGet<EventTypesEnvelopeDTO>('/event-types');
    return dto.data;
  },

  /** US-009: catálogo de ubicaciones disponibles. */
  async listLocations(): Promise<LocationOption[]> {
    const dto = await httpGet<LocationsEnvelopeDTO>('/locations');
    return dto.data;
  },
};
