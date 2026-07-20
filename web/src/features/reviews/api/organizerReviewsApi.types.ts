// Tipos DTO — organizer reviews create (US-065 / PB-P1-038 / FE-003).
//
// Espejo del contrato §9 API. El backend responde envelope `{ data, correlationId }`.
// Request body en snake_case (contrato §7 DTO); Response body camelCase (BR-API-004).

export interface CreateReviewInput {
  eventId: string;
  vendorProfileId: string;
  rating: number;
  comment?: string;
}

export interface CreateReviewRequestBody {
  event_id: string;
  vendor_profile_id: string;
  rating: number;
  comment?: string;
}

export interface CreateReviewDTO {
  id: string;
  eventId: string;
  vendorProfileId: string;
  bookingIntentId: string;
  authorUserId: string;
  rating: number;
  comment: string | null;
  status: 'published' | 'hidden' | 'removed';
  createdAt: string;
}

export interface CreateReviewEnvelope {
  data: CreateReviewDTO;
  correlationId: string;
}

export interface CreateReviewView {
  reviewId: string;
  eventId: string;
  vendorProfileId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export function toCreateReviewView(dto: CreateReviewDTO): CreateReviewView {
  return {
    reviewId: dto.id,
    eventId: dto.eventId,
    vendorProfileId: dto.vendorProfileId,
    rating: dto.rating,
    comment: dto.comment,
    createdAt: dto.createdAt,
  };
}

/** Códigos de error consumidos por el banner i18n del `ReviewForm`. */
export type CreateReviewErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'REVIEW_NOT_ELIGIBLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';

/** Razones de elegibilidad devueltas por el backend en `error.details[0].message`. */
export type ReviewNotEligibleReason =
  | 'no_booking'
  | 'event_not_completed'
  | 'window_expired'
  | 'already_reviewed';
