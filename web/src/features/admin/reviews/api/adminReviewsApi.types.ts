// Tipos DTO — Admin moderate review (US-067 / PB-P1-040 / FE-003). Espejo del contrato
// backend `POST /api/v1/admin/reviews/:id/moderate` (Tech Spec §7/§9).

export type ModerateAction = 'hide' | 'remove';

export interface ModerateReviewBodyDTO {
  action: ModerateAction;
  reason: string;
}

/** Response 200 tras moderación atómica. `status` refleja el destino (`hidden`|`removed`). */
export interface ModeratedReviewDTO {
  id: string;
  status: 'hidden' | 'removed';
  moderatedAt: string;
  moderatedBy: string;
  moderationReason: string;
  adminActionId: string;
}

export interface ModeratedReviewEnvelope {
  data: ModeratedReviewDTO;
  correlationId: string;
}

/** Códigos de error consumidos por el UI del panel admin. */
export type ModerateReviewErrorCode =
  | 'VALIDATION_ERROR' // action inválido, reason fuera de [10..500], body con campos extra
  | 'INVALID_UUID' // path param `:id` no es UUID
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'REVIEW_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
