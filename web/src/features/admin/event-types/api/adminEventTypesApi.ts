// API client — admin event types (US-076 / FE-004). Paridad EXACTA con el contrato
// backend (Tech Spec §7). Todas las mutaciones devuelven el EventType actualizado.
import { httpDelete, httpGet, httpPatch, httpPost } from '@/shared/api-client';
import type {
  AdminEventTypeEnvelope,
  AdminEventTypeNode,
  AdminEventTypesListDTO,
  AdminEventTypesListEnvelope,
  CreateEventTypeBodyDTO,
  DeleteEventTypeBodyDTO,
  UpdateEventTypeBodyDTO,
} from './adminEventTypesApi.types';

export const adminEventTypesApi = {
  /** GET /admin/event-types → listado plano incluyendo `is_active=false`. */
  async list(): Promise<AdminEventTypesListDTO> {
    const envelope = await httpGet<AdminEventTypesListEnvelope>('/admin/event-types');
    return envelope.data;
  },

  /** POST /admin/event-types → 201 con EventType creado. */
  async create(body: CreateEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    const envelope = await httpPost<AdminEventTypeEnvelope, CreateEventTypeBodyDTO>(
      '/admin/event-types',
      { body },
    );
    return envelope.data;
  },

  /** PATCH /admin/event-types/:id → 200 con EventType actualizado. */
  async update(id: string, body: UpdateEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    const envelope = await httpPatch<AdminEventTypeEnvelope, UpdateEventTypeBodyDTO>(
      `/admin/event-types/${encodeURIComponent(id)}`,
      { body },
    );
    return envelope.data;
  },

  /** DELETE /admin/event-types/:id — soft delete con `reason` requerido. */
  async softDelete(id: string, body: DeleteEventTypeBodyDTO): Promise<AdminEventTypeNode> {
    const envelope = await httpDelete<AdminEventTypeEnvelope>(
      `/admin/event-types/${encodeURIComponent(id)}`,
      { body },
    );
    return envelope.data;
  },
};
