// API client — Admin reviews (US-067 moderate + US-077 list).
//
// - `moderate(reviewId, {action, reason})` → `POST /api/v1/admin/reviews/:id/moderate`.
// - `list(filters)` → `GET /api/v1/admin/reviews?...` (US-077).
//
// Ambos usan credenciales de sesión (cookie HTTP-only signed). El backend es source of truth
// de autorización — el cliente NO infiere role. El listing serializa `status[]` como repeat
// (`?status=a&status=b`) para respetar la convención del backend (`AdminReviewsQuerySchema`),
// y coacciona `has_admin_action`/`rating_min`/`rating_max`/`page_size` a snake_case + string.
import { httpGet, httpPost } from '@/shared/api-client';
import type {
  AdminReviewListFilters,
  AdminReviewsListDTO,
  AdminReviewsListEnvelope,
  ModerateReviewBodyDTO,
  ModeratedReviewDTO,
  ModeratedReviewEnvelope,
} from './adminReviewsApi.types';

/** Convierte los filtros del cliente al query-string aceptado por el backend. */
function toQueryString(f: AdminReviewListFilters): string {
  const params = new URLSearchParams();
  if (f.status && f.status.length > 0) {
    for (const s of f.status) params.append('status', s);
  }
  if (f.vendorId) params.set('vendor_id', f.vendorId);
  if (f.createdAtFrom) params.set('created_at_from', f.createdAtFrom);
  if (f.createdAtTo) params.set('created_at_to', f.createdAtTo);
  if (f.ratingMin !== undefined) params.set('rating_min', String(f.ratingMin));
  if (f.ratingMax !== undefined) params.set('rating_max', String(f.ratingMax));
  if (f.hasAdminAction !== undefined) params.set('has_admin_action', String(f.hasAdminAction));
  if (f.pageSize !== undefined) params.set('pageSize', String(f.pageSize));
  if (f.cursor) params.set('cursor', f.cursor);
  return params.toString();
}

export const adminReviewsApi = {
  async moderate(reviewId: string, body: ModerateReviewBodyDTO): Promise<ModeratedReviewDTO> {
    const envelope = await httpPost<ModeratedReviewEnvelope, ModerateReviewBodyDTO>(
      `/admin/reviews/${encodeURIComponent(reviewId)}/moderate`,
      { body },
    );
    return envelope.data;
  },

  async list(filters: AdminReviewListFilters = {}): Promise<AdminReviewsListDTO> {
    const qs = toQueryString(filters);
    const envelope = await httpGet<AdminReviewsListEnvelope>(
      `/admin/reviews${qs ? `?${qs}` : ''}`,
    );
    return envelope.data;
  },
};
