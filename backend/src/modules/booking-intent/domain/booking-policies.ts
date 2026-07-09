// Policies de dominio BookingIntent (US-096 / BE-002). AC-11/AC-12; EC-08.
import type { BookingIntentStatusValue } from './booking-intent.js';

/** Solo un `pending` se puede confirmar (AC-11). */
export function canConfirmBooking(status: BookingIntentStatusValue): boolean {
  return status === 'pending';
}

/** Cancelable en `pending` o `confirmed_intent` (AC-12; sin penalización). No si ya `cancelled`. */
export function canCancelBooking(status: BookingIntentStatusValue): boolean {
  return status === 'pending' || status === 'confirmed_intent';
}
