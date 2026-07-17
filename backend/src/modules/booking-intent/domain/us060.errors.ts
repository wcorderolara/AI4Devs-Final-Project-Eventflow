// Errores de dominio del endpoint `POST /api/v1/booking-intents` (US-060 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * Quote inexistente o de evento no propio (EC-04, SEC-03, D7). Emite `404 QUOTE_NOT_FOUND`
 * uniforme — no filtra existencia ni ownership. La clase es local al módulo `booking-intent`
 * para respetar ADR-ARCH-001 (no importar desde `quote-flow`); el error handler mapea la
 * instancia al mismo código estable (`QUOTE_NOT_FOUND`) que la clase homónima de `quote-flow`.
 */
export class QuoteNotFoundForBookingError extends AppError {
  readonly code = ErrorCodes.QUOTE_NOT_FOUND;
  constructor(message = 'Quote not found') {
    super(message);
  }
}

/**
 * Disclaimer server-side enforcement (D2, FR-BOOKING-006). Emite `400 DISCLAIMER_REQUIRED` con
 * `details.field='disclaimer_accepted'` cuando el body llega con `disclaimer_accepted:false` o
 * ausente. El DTO Zod acepta `boolean` (no `literal(true)`) para diferenciar `false` (⇒ este
 * error) de "no es booleano" (⇒ `VALIDATION_ERROR` estándar del middleware).
 */
export class DisclaimerRequiredError extends AppError {
  readonly code = ErrorCodes.DISCLAIMER_REQUIRED;
  constructor(message = 'Booking intent requires explicit disclaimer acceptance') {
    super(message);
  }
}

/**
 * Quote no es aceptable: `status ∉ {sent}` (EC-02, VR-05). Emite `409 QUOTE_NOT_ACCEPTABLE` con
 * `details.current_status`. Nota (DEV-02 del execution record): el enum `QuoteStatus` no incluye
 * `responded` — ese status pertenece a `QuoteRequest`. La lista efectiva de estados aceptables
 * en este UC es sólo `{sent}` (una Quote `is_preferred=true` sigue siendo `status='sent'`).
 */
export class QuoteNotAcceptableError extends AppError {
  readonly code = ErrorCodes.QUOTE_NOT_ACCEPTABLE;
  constructor(
    public readonly currentStatus: string,
    message = 'Quote is not acceptable in its current state',
  ) {
    super(message);
  }
}

/**
 * Ya existe un BookingIntent activo (`pending` o `confirmed_intent`) para la Quote target
 * (EC-03, VR-07, BR-BOOKING-004). Emite `409 BOOKING_INTENT_ALREADY_EXISTS` con
 * `details.booking_intent_id`. El UNIQUE parcial `uq_booking_intents_active_per_quote` actúa
 * como constraint DB de último recurso; el `SELECT FOR UPDATE` en el UC evita ventanas ante 2
 * POST simultáneos y transforma un P2002 en este error de dominio explícito.
 */
export class BookingIntentAlreadyExistsError extends AppError {
  readonly code = ErrorCodes.BOOKING_INTENT_ALREADY_EXISTS;
  constructor(
    public readonly bookingIntentId: string,
    message = 'A booking intent is already active for this quote',
  ) {
    super(message);
  }
}
