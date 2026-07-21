// US-080 / FE-005 — Cliente admin del audit log AdminAction. Todas las llamadas usan
// `credentials: 'include'` vía `httpGet`. El backend es source of truth de autorización.
//
// AC-03 · inmutabilidad arquitectónica: este cliente SOLO expone `list()`. NO existen
// métodos `create/update/delete` — cualquier verbo de escritura contra
// `/api/v1/admin/admin-actions/*` retorna 404 (el backend no registra esas rutas).
import { httpGet } from '@/shared/api-client';
import type {
  AdminActionsListDTO,
  AdminActionsListEnvelope,
  AdminActionsListFilters,
} from './adminActionsApi.types';

function toListQueryString(f: AdminActionsListFilters): string {
  const params = new URLSearchParams();
  if (f.adminId) params.set('admin_id', f.adminId);
  if (f.targetType) params.set('target_type', f.targetType);
  if (f.targetId) params.set('target_id', f.targetId);
  if (f.action) params.set('action', f.action);
  if (f.createdAtFrom) params.set('created_at_from', f.createdAtFrom);
  if (f.createdAtTo) params.set('created_at_to', f.createdAtTo);
  if (f.pageSize !== undefined) params.set('pageSize', String(f.pageSize));
  if (f.cursor) params.set('cursor', f.cursor);
  return params.toString();
}

export const adminActionsApi = {
  /** US-080 / AC-01: listado admin paginado del audit log con filtros combinados. */
  async list(filters: AdminActionsListFilters = {}): Promise<AdminActionsListDTO> {
    const qs = toListQueryString(filters);
    const envelope = await httpGet<AdminActionsListEnvelope>(
      `/admin/admin-actions${qs ? `?${qs}` : ''}`,
    );
    return envelope.data;
  },
};
