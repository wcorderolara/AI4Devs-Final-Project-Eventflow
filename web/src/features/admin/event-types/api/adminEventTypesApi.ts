// API client — admin event types (US-076 / FE-004). Paridad EXACTA con el contrato
// backend (Tech Spec §7). Todas las mutaciones devuelven el EventType actualizado.
import { httpDeleteData, httpGetData, httpPatchData, httpPostData } from '@/shared/api-client';
import type {
  AdminEventTypeNode,
  AdminEventTypesListDTO,
  CreateEventTypeBodyDTO,
  DeleteEventTypeBodyDTO,
  UpdateEventTypeBodyDTO,
} from './adminEventTypesApi.types';

export const adminEventTypesApi = {
  /** GET /admin/event-types → listado plano incluyendo `is_active=false`. */
  async list(): Promise<AdminEventTypesListDTO> {
    return httpGetData<AdminEventTypesListDTO>('/admin/event-types');
  },

  /** POST /admin/event-types → 201 con EventType creado. */
  async create(body: CreateEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    return httpPostData<AdminEventTypeNode, CreateEventTypeBodyDTO>('/admin/event-types', { body });
  },

  /** PATCH /admin/event-types/:id → 200 con EventType actualizado. */
  async update(id: string, body: UpdateEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    return httpPatchData<AdminEventTypeNode, UpdateEventTypeBodyDTO>(
      `/admin/event-types/${encodeURIComponent(id)}`,
      { body },
    );
  },

  /** DELETE /admin/event-types/:id — soft delete con `reason` requerido. */
  async softDelete(id: string, body: DeleteEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    return httpDeleteData<AdminEventTypeNode>(`/admin/event-types/${encodeURIComponent(id)}`, {
      body,
    });
  },
};
