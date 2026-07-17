// Tipos DTO — booking-intent create (US-060 / PB-P1-036 / FE-002). Espejo del contrato §9 API.
//
// El backend responde envelope `{ data, correlationId }`; el response DTO es camelCase por
// consistencia con el resto de responses del módulo booking (véase `booking-intent.response.ts`).
// El request body es snake_case (contrato §7 DTOs) — `quote_id` + `disclaimer_accepted:true`.

export interface CreateBookingIntentInput {
  quoteId: string;
  disclaimerAccepted: boolean;
}

export interface CreateBookingIntentRequestBody {
  quote_id: string;
  disclaimer_accepted: boolean;
}

export interface CreateBookingIntentDTO {
  id: string;
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: 'pending';
  isSimulated: boolean;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingIntentEnvelope {
  data: CreateBookingIntentDTO;
  correlationId: string;
}

/**
 * View expuesta a la UI — se queda camelCase y proyecta lo mínimo que necesita el dialog
 * (`bookingIntentId`, `quoteId`, `status`, `createdAt`). Sin campos que puedan sugerir pago.
 */
export interface CreateBookingIntentView {
  bookingIntentId: string;
  quoteId: string;
  status: 'pending';
  createdAt: string;
}

export function toCreateBookingIntentView(dto: CreateBookingIntentDTO): CreateBookingIntentView {
  return {
    bookingIntentId: dto.id,
    quoteId: dto.quoteId,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

/**
 * Códigos de error estables consumidos por el banner i18n del `CreateBookingDialog`.
 * Cualquier otro código cae al key genérico `UNEXPECTED`.
 */
export type CreateBookingIntentErrorCode =
  | 'DISCLAIMER_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'QUOTE_NOT_FOUND'
  | 'QUOTE_NOT_ACCEPTABLE'
  | 'QUOTE_EXPIRED'
  | 'BOOKING_INTENT_ALREADY_EXISTS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNEXPECTED';
