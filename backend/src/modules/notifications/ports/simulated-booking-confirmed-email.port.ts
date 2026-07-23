// US-070 (PB-P2-007 / BE-004). Puerto `SimulatedBookingConfirmedEmailPort`.
// Paridad estructural con `SimulatedQuoteReceivedEmailPort` (US-069) pero dedicado
// al canal `[EMAIL] bookingConfirmed`. SEC-02 no-PII: sólo se emiten claves
// seguras (`userId, bookingIntentId, quoteId, quoteRequestId, eventId,
// vendorProfileId, correlationId, recipientRole, subject, body localizados`).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { BookingConfirmedRole } from '../i18n/booking-confirmed-templates.js';

export interface SimulatedBookingConfirmedEmailInput {
  toUserId: string;
  recipientRole: BookingConfirmedRole;
  bookingIntentId: string;
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  vendorProfileId: string;
  language: SupportedLanguage;
  correlationId: string;
}

export interface SimulatedBookingConfirmedEmailPort {
  logEmail(input: SimulatedBookingConfirmedEmailInput): void;
}
