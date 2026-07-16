// Errores de dominio del endpoint `POST /api/v1/quotes/:quoteId/reject` (US-054).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details` cuando aplica.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * Quote inexistente o de evento no propio del organizer — 404 QUOTE_NOT_FOUND uniforme (SEC-03).
 * Distinta de `QrNotFoundError` (que apunta a QuoteRequest): esta refiere al recurso Quote
 * para no filtrar existencia ni ownership del par (event, quote).
 */
export class QuoteNotFoundError extends AppError {
  readonly code = ErrorCodes.QUOTE_NOT_FOUND;
  constructor(message = 'Quote not found') {
    super(message);
  }
}

/**
 * Quote no rechazable: `status ≠ 'sent'` (EC-01) o re-rechazo idempotente (EC-05).
 * Emite 409 QUOTE_NOT_REJECTABLE con `details.current_status`.
 */
export class QuoteNotRejectableError extends AppError {
  readonly code = ErrorCodes.QUOTE_NOT_REJECTABLE;
  constructor(
    public readonly currentStatus: string,
    message = 'Quote is not rejectable in its current state',
  ) {
    super(message);
  }
}

/**
 * `body.reason` excede 500 caracteres (EC-03, VR-02). Emite 400 INVALID_REJECTION_REASON
 * en lugar del genérico VALIDATION_ERROR para respetar el contrato estable §7 del Tech Spec.
 */
export class InvalidRejectionReasonError extends AppError {
  readonly code = ErrorCodes.INVALID_REJECTION_REASON;
  constructor(message = 'reason exceeds maximum length of 500 characters') {
    super(message);
  }
}
