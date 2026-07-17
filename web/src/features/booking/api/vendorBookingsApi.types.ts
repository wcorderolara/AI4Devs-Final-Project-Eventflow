// Tipos DTO — vendor booking-intent confirm (US-061 / PB-P1-036 / FE-002). Espejo del contrato
// §9 API del Tech Spec. El backend responde envelope `{ data, correlationId }` con la vista
// completa del BookingIntent (camelCase, mismo shape que US-060 create); la view expuesta a la
// UI proyecta lo mínimo que necesita el dialog.

export interface ConfirmBookingIntentInput {
  bookingIntentId: string;
  /**
   * US-063 (FE-003 / D1): enforcement server-side bilateral del disclaimer. El dialog padre
   * siempre pasa `true` porque el checkbox del `BookingDisclaimer` ya bloqueó la CTA cuando
   * `false`. Se preserva como campo del input para que el mock de tests pueda inyectar
   * `false` y verificar el mapeo del código estable `DISCLAIMER_REQUIRED` del backend.
   */
  disclaimerAccepted: boolean;
}

/**
 * US-063 (FE-003 / D1): body del request — snake_case por contrato del endpoint
 * `POST /api/v1/booking-intents/:id/confirm`.
 */
export interface ConfirmBookingIntentRequestBody {
  disclaimer_accepted: boolean;
}

export interface ConfirmBookingIntentDTO {
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

export interface ConfirmBookingIntentEnvelope {
  data: ConfirmBookingIntentDTO;
  correlationId: string;
}

/**
 * View expuesta a la UI — sólo `bookingIntentId`, `status` y `confirmedAt` (nullable cuando el
 * backend devolvió `200` por idempotencia sobre un intent ya confirmado y no re-confirmed).
 */
export interface ConfirmBookingIntentView {
  bookingIntentId: string;
  status: 'pending' | 'confirmed_intent' | 'cancelled';
  confirmedAt: string | null;
}

export function toConfirmBookingIntentView(dto: ConfirmBookingIntentDTO): ConfirmBookingIntentView {
  return {
    bookingIntentId: dto.id,
    status: dto.status,
    confirmedAt: dto.confirmedAt,
  };
}

/**
 * Códigos de error estables consumidos por el banner i18n del `ConfirmBookingDialog`.
 * Cualquier otro código cae al key genérico `UNEXPECTED`.
 */
export type ConfirmBookingIntentErrorCode =
  | 'DISCLAIMER_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'BOOKING_INTENT_NOT_FOUND'
  | 'BOOKING_INTENT_NOT_CONFIRMABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
