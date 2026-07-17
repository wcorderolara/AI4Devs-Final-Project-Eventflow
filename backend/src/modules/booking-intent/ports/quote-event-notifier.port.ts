// Puerto (consumer-owned interface) para emitir notificaciones del lifecycle Booking/Quote
// desde el use case atómico de US-060. Preserva el import boundary de ADR-ARCH-001: la
// definición vive en `booking-intent`; el adapter concreto (`QuoteEventNotificationService`
// del módulo `quote-flow`) se inyecta desde el composition root del router — patrón idéntico
// al que US-039 aplicó para `BudgetCommittedSyncPort`.
//
// El shape es un subset del `EmitQuoteEventInput` del service común — sólo los campos que
// necesita el path US-060 (`recipientUserId`, `eventName`, `payload`, `tx`, `quoteId`,
// `correlationId`). El eventName acepta `'booking_intent.created'` explícitamente para acotar
// el contrato consumido por este módulo (los demás nombres del type quedan encapsulados en
// `quote-flow`).
import type { Prisma } from '@prisma/client';

export interface EmitBookingIntentCreatedInput {
  recipientUserId: string;
  eventName: 'booking_intent.created';
  payload: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
  quoteId?: string;
  correlationId?: string;
}

export interface BookingEventNotifierPort {
  emit(input: EmitBookingIntentCreatedInput): Promise<void>;
}
