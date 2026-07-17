// Tipos DTO — cancel booking-intent bilateral (US-062 / PB-P1-036 / FE-002).
// El body es opcional (`reason?: string` max 500 chars); AC-03 permite cancelar sin razón.
// El backend responde envelope `{ data, correlationId }` con la vista completa del BookingIntent.

export interface CancelBookingIntentInput {
  bookingIntentId: string;
  /** Motivo opcional (max 500 chars); trim + omit ⇒ persiste `null`. */
  reason?: string;
}

export interface CancelBookingIntentRequestBody {
  reason?: string;
}

export interface CancelBookingIntentDTO {
  id: string;
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: 'pending' | 'confirmed_intent' | 'cancelled';
  isSimulated: boolean;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CancelBookingIntentEnvelope {
  data: CancelBookingIntentDTO;
  correlationId: string;
}

export interface CancelBookingIntentView {
  bookingIntentId: string;
  status: 'cancelled';
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
}

export function toCancelBookingIntentView(dto: CancelBookingIntentDTO): CancelBookingIntentView {
  return {
    bookingIntentId: dto.id,
    status: 'cancelled',
    cancelledAt: dto.cancelledAt,
    cancelledBy: dto.cancelledBy,
    cancellationReason: dto.cancellationReason,
  };
}

/**
 * Códigos de error estables consumidos por el banner i18n del `CancelBookingDialog`.
 * Cualquier otro código cae al key genérico `UNEXPECTED`.
 */
export type CancelBookingIntentErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CANCELLATION_REASON'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'BOOKING_INTENT_NOT_FOUND'
  | 'BOOKING_INTENT_NOT_CANCELLABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
