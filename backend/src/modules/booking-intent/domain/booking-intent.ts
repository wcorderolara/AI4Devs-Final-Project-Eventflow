// Tipos de dominio de BookingIntent (US-096 / BE-002). Vista pública en shape del contrato API.
export const BOOKING_INTENT_STATUSES = ['pending', 'confirmed_intent', 'cancelled'] as const;
export type BookingIntentStatusValue = (typeof BOOKING_INTENT_STATUSES)[number];

export interface BookingIntentView {
  id: string;
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string | null;
  status: BookingIntentStatusValue;
  isSimulated: boolean;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}
