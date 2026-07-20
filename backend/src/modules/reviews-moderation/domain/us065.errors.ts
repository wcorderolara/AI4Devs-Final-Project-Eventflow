// Errores de dominio del endpoint `POST /api/v1/organizer/reviews` (US-065 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec + D6). Consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details`.
//
// Nomenclatura:
//   - `ReviewTargetNotFoundError` — 404 uniforme (event/vendor inexistente o ajeno; SEC-04, D6).
//     Se usa el código genérico `RESOURCE_NOT_FOUND` para NO revelar cuál fue el recurso
//     ausente (evita information leakage; alineado con AUTH-TS-03 y EC-06/EC-07).
//   - `ReviewNotEligibleError` — 403 con `details.reason` ∈
//     {`no_booking`, `event_not_completed`, `window_expired`, `already_reviewed`} (D6,
//     EC-01/EC-02/EC-03, AC-03). Diferencia flujos de elegibilidad propios del organizer.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export const REVIEW_NOT_ELIGIBLE_REASONS = [
  'no_booking',
  'event_not_completed',
  'window_expired',
  'already_reviewed',
] as const;

export type ReviewNotEligibleReason = (typeof REVIEW_NOT_ELIGIBLE_REASONS)[number];

/**
 * 404 uniforme cuando el evento o el vendor no existen, o cuando el organizer no es dueño del
 * evento (SEC-04, D6, AUTH-TS-03). No revela cuál faltó — el mensaje/envelope es idéntico para
 * los cuatro caminos posibles.
 */
export class ReviewTargetNotFoundError extends AppError {
  readonly code = ErrorCodes.RESOURCE_NOT_FOUND;
  constructor(message = 'Resource not found') {
    super(message);
  }
}

/**
 * 403 NOT_ELIGIBLE con `details.reason` específica. Cubre AC-03 (`already_reviewed`) y
 * EC-01..EC-03 (elegibilidad propia del organizer). No es leakage porque el organizer conoce
 * su propio evento y su historial de reviews.
 */
export class ReviewNotEligibleError extends AppError {
  readonly code = ErrorCodes.REVIEW_NOT_ELIGIBLE;
  constructor(
    public readonly reason: ReviewNotEligibleReason,
    message = 'Not eligible to review',
  ) {
    super(message);
  }
}
