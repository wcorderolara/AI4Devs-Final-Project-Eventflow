import { httpGet } from '@/shared/api-client';
import type {
  AdminEventEnvelopeDTO,
  AdminEventModel,
  AdminEventsListDTO,
  AdminEventsListEnvelope,
  AdminEventsListFilters,
} from './adminEventsApi.types';

/**
 * US-016 / FE-001 — Cliente admin de eventos. Todas las llamadas usan `credentials: 'include'`
 * (cookie HTTP-only signed) vía `httpGet`. El backend es source of truth de autorización; el
 * cliente no infiere role del usuario.
 *
 * US-078 / FE-004 — se añade `list(filters)` que serializa `status[]` como parámetros repetidos
 * (`?status=a&status=b`) para respetar la convención del backend (`AdminEventsQuerySchema`) y
 * traduce las claves camelCase del cliente a snake_case (contrato REST).
 */
function toListQueryString(f: AdminEventsListFilters): string {
  const params = new URLSearchParams();
  if (f.status && f.status.length > 0) {
    for (const s of f.status) params.append('status', s);
  }
  if (f.eventTypeId) params.set('event_type_id', f.eventTypeId);
  if (f.eventDateFrom) params.set('event_date_from', f.eventDateFrom);
  if (f.eventDateTo) params.set('event_date_to', f.eventDateTo);
  if (f.organizerSearch) params.set('organizer_search', f.organizerSearch);
  if (f.pageSize !== undefined) params.set('pageSize', String(f.pageSize));
  if (f.cursor) params.set('cursor', f.cursor);
  return params.toString();
}

export const adminEventsApi = {
  /** US-016 / AC-01: detalle admin del evento (read-only, incluye soft-deleted). */
  async getEvent(id: string): Promise<AdminEventModel> {
    const dto = await httpGet<AdminEventEnvelopeDTO>(`/admin/events/${id}`);
    return dto.data;
  },

  /** US-078 / AC-01: listado admin paginado con filtros combinados. */
  async list(filters: AdminEventsListFilters = {}): Promise<AdminEventsListDTO> {
    const qs = toListQueryString(filters);
    const envelope = await httpGet<AdminEventsListEnvelope>(
      `/admin/events${qs ? `?${qs}` : ''}`,
    );
    return envelope.data;
  },
};
