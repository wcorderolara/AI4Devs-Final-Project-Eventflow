// Errores de dominio del endpoint `PATCH /api/v1/quote-requests/:quoteRequestId/cancel` (US-056).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details` cuando aplica.
import { AppError, type ErrorDetail, type HttpErrorMapping } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * QuoteRequest inexistente o de evento no propio del organizer — 404 QR_NOT_FOUND uniforme (SEC-03).
 * Reusa el `QR_NOT_FOUND` ya introducido por US-051.
 */
export class QrNotFoundError extends AppError {
  readonly code = ErrorCodes.QR_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Quote request not found') {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Quote request not found', masked: true };
  }
}

/**
 * QuoteRequest no cancelable: `status ∉ ACTIVE_STATES = {sent, viewed, responded}` (EC-02) o
 * re-cancelación idempotente (EC-06). Emite 409 QR_NOT_CANCELLABLE con `details.current_status`.
 */
export class QrNotCancellableError extends AppError {
  readonly code = ErrorCodes.QR_NOT_CANCELLABLE;
  override readonly httpStatus = 409;
  constructor(
    public readonly currentStatus: string,
    message = 'Quote request cannot be cancelled in its current state',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'current_status', message: this.currentStatus }];
  }
}

/**
 * Existe al menos un `BookingIntent` con `status='confirmed_intent'` asociado a la Quote de esta
 * QuoteRequest (EC-01, VR-05). Emite 409 QR_HAS_CONFIRMED_BOOKING con `details.booking_intent_id`.
 */
export class QrHasConfirmedBookingError extends AppError {
  readonly code = ErrorCodes.QR_HAS_CONFIRMED_BOOKING;
  override readonly httpStatus = 409;
  constructor(
    public readonly bookingIntentId: string,
    message = 'Quote request has a confirmed booking intent',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'booking_intent_id', message: this.bookingIntentId }];
  }
}

/**
 * `body.reason` excede 500 caracteres (EC-04, VR-02). Emite 400 INVALID_CANCELLATION_REASON
 * en lugar del genérico VALIDATION_ERROR para respetar el contrato estable §7 del Tech Spec.
 */
export class InvalidCancellationReasonError extends AppError {
  readonly code = ErrorCodes.INVALID_CANCELLATION_REASON;
  override readonly httpStatus = 400;
  constructor(message = 'reason exceeds maximum length of 500 characters') {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'reason', message: 'too_long' }];
  }
}
