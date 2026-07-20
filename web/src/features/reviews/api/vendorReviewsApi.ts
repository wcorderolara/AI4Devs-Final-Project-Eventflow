// API client — Vendor reviews public listing (US-066 / PB-P1-039 / FE-003).
//
// Método `list(vendorId, {cursor, pageSize})` que llama `GET /api/v1/vendors/:id/reviews` y
// desanida el envelope `{ data, correlationId }`. Query params se pasan tal cual (cursor
// base64url + pageSize numérico) — el backend valida.
//
// Errores mapeados por el `httpClient` a `ApiError`. Códigos consumibles por la UI:
// `VALIDATION_ERROR` (400 — pageSize fuera de rango o UUID malformado en `:id`), `INVALID_CURSOR`
// (400 — cursor no decodifica), `VENDOR_NOT_FOUND` (404 — vendor inexistente o no `approved`
// para no-admin). Otros ⇒ `UNEXPECTED`.
import { httpGet } from '@/shared/api-client';
import type {
  ListVendorReviewsEnvelope,
  ListVendorReviewsQuery,
  ListVendorReviewsView,
} from './vendorReviewsApi.types';
import { toListVendorReviewsView } from './vendorReviewsApi.types';

export const vendorReviewsApi = {
  async list(vendorId: string, query: ListVendorReviewsQuery = {}): Promise<ListVendorReviewsView> {
    const envelope = await httpGet<ListVendorReviewsEnvelope>(
      `/vendors/${encodeURIComponent(vendorId)}/reviews`,
      {
        query: {
          ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
          ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
        },
      },
    );
    return toListVendorReviewsView(envelope.data);
  },
};
