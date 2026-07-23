// US-070 (PB-P2-007 / BE-004). Adapter Prisma-agnóstico del
// `SimulatedBookingConfirmedEmailPort`. Emite log estructurado
// `event='email_simulated'` con template `notif.bookingConfirmed.<role>`
// (paridad con `LoggingSimulatedQuoteReceivedEmailAdapter` de US-069).
//
// SEC-02: el set de claves emitidas se declara en
// `BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS`. El test SEC-T-01 verifica
// igualdad exacta.
import type {
  SimulatedBookingConfirmedEmailInput,
  SimulatedBookingConfirmedEmailPort,
} from '../ports/simulated-booking-confirmed-email.port.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { renderBookingConfirmedTemplate } from '../i18n/booking-confirmed-templates.js';

export interface BookingConfirmedEmailLogger {
  info(payload: Record<string, unknown>): void;
}

/** Set canónico de claves emitidas por `logEmail`. Test SEC-T-01 verifica igualdad exacta. */
export const BOOKING_CONFIRMED_EMAIL_LOG_ALLOWED_KEYS: readonly string[] = [
  'event',
  'template',
  'correlationId',
  'to',
  'userId',
  'recipientRole',
  'bookingIntentId',
  'quoteId',
  'quoteRequestId',
  'eventId',
  'vendorProfileId',
  'language',
  'subject',
  'body',
];

export class LoggingSimulatedBookingConfirmedEmailAdapter
  implements SimulatedBookingConfirmedEmailPort
{
  constructor(private readonly log: BookingConfirmedEmailLogger = logger) {}

  logEmail(input: SimulatedBookingConfirmedEmailInput): void {
    const { subject, body } = renderBookingConfirmedTemplate(
      input.recipientRole,
      input.language,
    );
    this.log.info({
      event: 'email_simulated',
      template: `notif.bookingConfirmed.${input.recipientRole}`,
      correlationId: input.correlationId,
      to: input.toUserId,
      userId: input.toUserId,
      recipientRole: input.recipientRole,
      bookingIntentId: input.bookingIntentId,
      quoteId: input.quoteId,
      quoteRequestId: input.quoteRequestId,
      eventId: input.eventId,
      vendorProfileId: input.vendorProfileId,
      language: input.language,
      subject,
      body,
    });
  }
}
