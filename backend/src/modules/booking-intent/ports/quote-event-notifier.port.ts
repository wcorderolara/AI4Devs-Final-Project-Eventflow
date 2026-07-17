// Puerto (consumer-owned interface) para emitir notificaciones del lifecycle Booking/Quote
// desde los use cases del módulo booking-intent. Preserva el import boundary de ADR-ARCH-001:
// la definición vive en `booking-intent`; el adapter concreto (`QuoteEventNotificationService`
// del módulo `quote-flow`) se inyecta desde el composition root del router — patrón idéntico
// al que US-039 aplicó para `BudgetCommittedSyncPort`.
//
// El shape es un subset del `EmitQuoteEventInput` del service común — sólo los campos que
// necesitan los paths US-060 (create) y US-061 (confirm): `recipientUserId`, `eventName`,
// `payload`, `tx`, `quoteId`, `correlationId`. El eventName acota los nombres consumidos por
// este módulo (los demás nombres del type quedan encapsulados en `quote-flow`).
//
// US-060: `booking_intent.created` — recipient = vendor asignado al Quote.
// US-061: `booking_intent.confirmed` — recipient = organizer dueño del evento.
// US-062: `booking_intent.cancelled` — recipient = contraparte del actor (organizer ⇄ vendor).
import type { Prisma } from '@prisma/client';

export type BookingIntentEventName =
  | 'booking_intent.created'
  | 'booking_intent.confirmed'
  | 'booking_intent.cancelled';

export interface EmitBookingIntentEventInput {
  recipientUserId: string;
  eventName: BookingIntentEventName;
  payload: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
  quoteId?: string;
  correlationId?: string;
}

export interface BookingEventNotifierPort {
  emit(input: EmitBookingIntentEventInput): Promise<void>;
}

/**
 * @deprecated Preservado para compatibilidad con imports existentes de US-060. Usar
 * `EmitBookingIntentEventInput` (que acepta también `booking_intent.confirmed`).
 */
export type EmitBookingIntentCreatedInput = EmitBookingIntentEventInput & {
  eventName: 'booking_intent.created';
};
