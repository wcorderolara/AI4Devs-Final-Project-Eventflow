// US-069 (PB-P2-006 / BE-004). Adapter Prisma-agnóstico del
// `SimulatedQuoteReceivedEmailPort`. Emite log estructurado
// `event='email_simulated'` con template `notif.quoteReceived` (paridad con
// `LoggingSimulatedQrReceivedEmailAdapter` de US-068).
//
// SEC-02: el set de claves emitidas se declara en
// `QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS`. El test SEC-T-01 verifica igualdad exacta.
import type {
  SimulatedQuoteReceivedEmailInput,
  SimulatedQuoteReceivedEmailPort,
} from '../ports/simulated-quote-received-email.port.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { renderQuoteReceivedTemplate } from '../i18n/quote-received-templates.js';

export interface QuoteReceivedEmailLogger {
  info(payload: Record<string, unknown>): void;
}

/** Set canónico de claves emitidas por `logEmail`. Test SEC-T-01 verifica igualdad exacta. */
export const QUOTE_RECEIVED_EMAIL_LOG_ALLOWED_KEYS: readonly string[] = [
  'event',
  'template',
  'correlationId',
  'to',
  'userId',
  'quoteId',
  'quoteRequestId',
  'eventId',
  'vendorProfileId',
  'language',
  'subject',
  'body',
];

export class LoggingSimulatedQuoteReceivedEmailAdapter
  implements SimulatedQuoteReceivedEmailPort
{
  constructor(private readonly log: QuoteReceivedEmailLogger = logger) {}

  logEmail(input: SimulatedQuoteReceivedEmailInput): void {
    const { subject, body } = renderQuoteReceivedTemplate(input.language);
    this.log.info({
      event: 'email_simulated',
      template: 'notif.quoteReceived',
      correlationId: input.correlationId,
      to: input.toUserId,
      userId: input.toUserId,
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
