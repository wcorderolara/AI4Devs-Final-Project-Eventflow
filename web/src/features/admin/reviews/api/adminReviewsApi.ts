// API client — Admin moderate review (US-067 / PB-P1-040 / FE-003).
//
// `moderate(reviewId, {action, reason})` llama `POST /api/v1/admin/reviews/:id/moderate` con
// credenciales de sesión (cookie HTTP-only signed) vía `httpPost` y desanida el envelope
// `{ data, correlationId }`. El backend es source of truth de autorización — el cliente NO
// infiere role.
//
// El backend valida DTO `.strict()` (VR-04) — el cliente sólo envía `{action, reason}` (no
// agrega campos extra). Errores mapeados por `httpClient` a `ApiError`; ver `ModerateReviewErrorCode`.
import { httpPost } from '@/shared/api-client';
import type {
  ModerateReviewBodyDTO,
  ModeratedReviewDTO,
  ModeratedReviewEnvelope,
} from './adminReviewsApi.types';

export const adminReviewsApi = {
  async moderate(reviewId: string, body: ModerateReviewBodyDTO): Promise<ModeratedReviewDTO> {
    const envelope = await httpPost<ModeratedReviewEnvelope, ModerateReviewBodyDTO>(
      `/admin/reviews/${encodeURIComponent(reviewId)}/moderate`,
      { body },
    );
    return envelope.data;
  },
};
