// API client — organizer reviews (US-065 / PB-P1-038 / FE-003).
//
// Método `create` que llama `POST /api/v1/organizer/reviews` con body snake_case
// `{ event_id, vendor_profile_id, rating, comment? }` y desanida el envelope
// `{ data, correlationId }`.
//
// Errores mapeados por el `httpClient` a `ApiError`. Códigos consumibles por la UI:
// `VALIDATION_ERROR` (400), `AUTHENTICATION_REQUIRED` (401), `FORBIDDEN` (403),
// `RESOURCE_NOT_FOUND` (404 uniforme), `REVIEW_NOT_ELIGIBLE` (403 con
// `details[0].message` ∈ {`no_booking`, `event_not_completed`, `window_expired`,
// `already_reviewed`}), `RATE_LIMIT_EXCEEDED` (429). Otros ⇒ `UNEXPECTED`.
import { httpPost } from '@/shared/api-client';
import type {
  CreateReviewEnvelope,
  CreateReviewInput,
  CreateReviewRequestBody,
  CreateReviewView,
} from './organizerReviewsApi.types';
import { toCreateReviewView } from './organizerReviewsApi.types';

export const organizerReviewsApi = {
  async create(input: CreateReviewInput): Promise<CreateReviewView> {
    const body: CreateReviewRequestBody = {
      event_id: input.eventId,
      vendor_profile_id: input.vendorProfileId,
      rating: input.rating,
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
    };
    const envelope = await httpPost<CreateReviewEnvelope, CreateReviewRequestBody>(
      `/organizer/reviews`,
      { body },
    );
    return toCreateReviewView(envelope.data);
  },
};
