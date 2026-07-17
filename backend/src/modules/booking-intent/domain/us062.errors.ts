// Errores de dominio del endpoint `POST /api/v1/booking-intents/:id/cancel` (US-062 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details`.
//
// El error `BookingIntentNotFoundError` es compartido con US-061 y vive en `us061.errors.ts`
// (mismo código estable `BOOKING_INTENT_NOT_FOUND` uniforme para 404 bilateral).
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * BookingIntent no cancelable: `status ∉ {pending, confirmed_intent}` (EC-01, VR-05). Emite
 * `409 BOOKING_INTENT_NOT_CANCELLABLE` con `details.current_status`. A diferencia del confirm
 * (US-061), la cancelación NO es idempotente en el contrato: un segundo POST sobre un intent
 * ya `cancelled` responde 409 en lugar de 200 (US-062 D6).
 */
export class BookingIntentNotCancellableError extends AppError {
  readonly code = ErrorCodes.BOOKING_INTENT_NOT_CANCELLABLE;
  constructor(
    public readonly currentStatus: string,
    message = 'Booking intent cannot be cancelled in its current state',
  ) {
    super(message);
  }
}

/**
 * Motivo de cancelación inválido (> 500 chars tras trim). Emite `400 INVALID_CANCELLATION_REASON`
 * con `details.field='reason'`. La longitud 0 (omitido o cadena vacía) se acepta — US-062 AC-03
 * permite cancelar sin razón; el DTO Zod aplica `.optional()` + `.trim()`.
 */
export class InvalidCancellationReasonError extends AppError {
  readonly code = ErrorCodes.INVALID_CANCELLATION_REASON;
  constructor(message = 'Cancellation reason must not exceed 500 characters') {
    super(message);
  }
}
