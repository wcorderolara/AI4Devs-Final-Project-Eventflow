// Errores de dominio del endpoint `POST /api/v1/booking-intents/:id/confirm` (US-061 / BE-002).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * BookingIntent inexistente o vendor ajeno (EC-02/EC-03, SEC-03). Emite `404
 * BOOKING_INTENT_NOT_FOUND` uniforme — no filtra existencia ni vendor assignment. La clase es
 * local al módulo `booking-intent`.
 */
export class BookingIntentNotFoundError extends AppError {
  readonly code = ErrorCodes.BOOKING_INTENT_NOT_FOUND;
  constructor(message = 'Booking intent not found') {
    super(message);
  }
}

/**
 * BookingIntent no confirmable: `status ∉ {pending, confirmed_intent}` (EC-01, VR-03). Emite
 * `409 BOOKING_INTENT_NOT_CONFIRMABLE` con `details.current_status`. El caller distingue
 * idempotencia (status ya `confirmed_intent` ⇒ 200 no-op) del bloqueo (status `cancelled` ⇒
 * este error).
 */
export class BookingIntentNotConfirmableError extends AppError {
  readonly code = ErrorCodes.BOOKING_INTENT_NOT_CONFIRMABLE;
  constructor(
    public readonly currentStatus: string,
    message = 'Booking intent cannot be confirmed in its current state',
  ) {
    super(message);
  }
}
