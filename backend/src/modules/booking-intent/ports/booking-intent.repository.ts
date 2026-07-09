// Puertos de persistencia de booking-intent (US-096 / BE-006). Module-local.
import type { BookingIntentView } from '../domain/booking-intent.js';

export interface CreateBookingIntentData {
  quoteId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string;
}

export interface BookingIntentRepository {
  create(data: CreateBookingIntentData): Promise<BookingIntentView>;
  findById(id: string): Promise<BookingIntentView | null>;
  confirm(id: string, now: Date): Promise<BookingIntentView>;
  cancel(input: { id: string; now: Date; cancelledBy: string; reason: string }): Promise<BookingIntentView>;
}

/** Contexto de un Quote leído directamente (sin importar quote-flow): para crear BookingIntent. */
export interface AcceptedQuoteContext {
  quoteId: string;
  quoteRequestId: string;
  eventId: string;
  serviceCategoryId: string;
  vendorProfileId: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: Date | null;
}

export interface QuoteContextReader {
  findQuoteContext(quoteId: string): Promise<AcceptedQuoteContext | null>;
}
