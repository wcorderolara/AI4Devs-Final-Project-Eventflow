// US-068 (PB-P2-005 / BE-004). Adapter Prisma-agnóstico del
// `SimulatedQrReceivedEmailPort`. Emite log estructurado
// `event='email_simulated'` con template `notif.qrReceived` (paridad con
// `LoggingSimulatedT7EmailAdapter` de US-034).
//
// SEC-02: el set de claves emitidas se declara en `QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS`.
// El test SEC-T-01 verifica igualdad exacta.
import type {
  SimulatedQrReceivedEmailInput,
  SimulatedQrReceivedEmailPort,
} from '../ports/simulated-qr-received-email.port.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { renderQrReceivedTemplate } from '../i18n/qr-received-templates.js';

export interface QrReceivedEmailLogger {
  info(payload: Record<string, unknown>): void;
}

/** Set canónico de claves emitidas por `logEmail`. Test SEC-T-01 verifica igualdad exacta. */
export const QR_RECEIVED_EMAIL_LOG_ALLOWED_KEYS: readonly string[] = [
  'event',
  'template',
  'correlationId',
  'to',
  'userId',
  'quoteRequestId',
  'eventId',
  'organizerId',
  'categoryCode',
  'language',
  'subject',
  'body',
];

export class LoggingSimulatedQrReceivedEmailAdapter implements SimulatedQrReceivedEmailPort {
  constructor(private readonly log: QrReceivedEmailLogger = logger) {}

  logEmail(input: SimulatedQrReceivedEmailInput): void {
    const { subject, body } = renderQrReceivedTemplate(input.language, {
      categoryCode: input.categoryCode,
    });
    this.log.info({
      event: 'email_simulated',
      template: 'notif.qrReceived',
      correlationId: input.correlationId,
      to: input.toUserId,
      userId: input.toUserId,
      quoteRequestId: input.quoteRequestId,
      eventId: input.eventId,
      organizerId: input.organizerId,
      categoryCode: input.categoryCode,
      language: input.language,
      subject,
      body,
    });
  }
}
