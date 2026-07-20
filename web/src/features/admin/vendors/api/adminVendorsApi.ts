// API client — Admin vendors (US-074 list + US-047 moderate).
//
// - `list(filters)`         → `GET /api/v1/admin/vendors?...` (US-074).
// - `moderate(id, body)`    → `POST /api/v1/admin/vendors/:id/moderate` (US-047).
//
// Ambos usan credenciales de sesión (cookie HTTP-only signed). El backend es source of truth
// de autorización — el cliente NO infiere role. El listing serializa `status[]` como repeat
// (`?status=a&status=b`) para respetar la convención del backend (`AdminVendorsQuerySchema`),
// y coacciona `is_hidden`/`business_name`/`created_at_*` a snake_case + string.
import { httpGet, httpPost } from '@/shared/api-client';
import type {
  AdminVendorListFilters,
  AdminVendorsListDTO,
  AdminVendorsListEnvelope,
  ModerateVendorBodyDTO,
  ModeratedVendorDTO,
  ModeratedVendorEnvelope,
} from './adminVendorsApi.types';

/** Convierte los filtros del cliente al query-string aceptado por el backend. */
function toQueryString(f: AdminVendorListFilters): string {
  const params = new URLSearchParams();
  if (f.status && f.status.length > 0) {
    for (const s of f.status) params.append('status', s);
  }
  if (f.isHidden !== undefined) params.set('is_hidden', String(f.isHidden));
  if (f.createdAtFrom) params.set('created_at_from', f.createdAtFrom);
  if (f.createdAtTo) params.set('created_at_to', f.createdAtTo);
  if (f.businessName) params.set('business_name', f.businessName);
  if (f.pageSize !== undefined) params.set('pageSize', String(f.pageSize));
  if (f.cursor) params.set('cursor', f.cursor);
  return params.toString();
}

export const adminVendorsApi = {
  async list(filters: AdminVendorListFilters = {}): Promise<AdminVendorsListDTO> {
    const qs = toQueryString(filters);
    const envelope = await httpGet<AdminVendorsListEnvelope>(
      `/admin/vendors${qs ? `?${qs}` : ''}`,
    );
    return envelope.data;
  },

  async moderate(
    vendorId: string,
    body: ModerateVendorBodyDTO,
  ): Promise<ModeratedVendorDTO> {
    // Se omite `reason` del body cuando no fue provisto — el backend valida cross-field D4.
    const clean: ModerateVendorBodyDTO = { action: body.action };
    if (body.reason !== undefined && body.reason.length > 0) clean.reason = body.reason;
    const envelope = await httpPost<ModeratedVendorEnvelope, ModerateVendorBodyDTO>(
      `/admin/vendors/${encodeURIComponent(vendorId)}/moderate`,
      { body: clean },
    );
    return envelope.data;
  },
};
