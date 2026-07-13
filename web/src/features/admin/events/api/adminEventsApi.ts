import { httpGet } from '@/shared/api-client';
import type { AdminEventEnvelopeDTO, AdminEventModel } from './adminEventsApi.types';

/**
 * US-016 / FE-001 — Cliente admin de eventos. Todas las llamadas usan `credentials: 'include'`
 * (cookie HTTP-only signed) vía `httpGet`. El backend es source of truth de autorización; el
 * cliente no infiere role del usuario.
 */
export const adminEventsApi = {
  /** US-016 / AC-01: detalle admin del evento (read-only, incluye soft-deleted). */
  async getEvent(id: string): Promise<AdminEventModel> {
    const dto = await httpGet<AdminEventEnvelopeDTO>(`/admin/events/${id}`);
    return dto.data;
  },
};
