// US-034 (PB-P2-004 / BE-005). Adapter Prisma-agnóstico del `SimulatedT7EmailPort`.
// Materializa el patrón `[EMAIL]` de NFR-OBS-004 como log estructurado
// `event='email_simulated'` (mismo canal que `LoggingWelcomeEmailNotifier` — US-001).
//
// Contrato SEC-02 (no-PII): el log incluye EXCLUSIVAMENTE las claves declaradas abajo.
// Nunca se emite `email`, `displayName`, `taskTitle`, `taskDescription`, `eventNotes`.
// El `subject`/`body` provienen de plantillas cuyos placeholders permitidos son sólo
// `taskId` y `dueDate` (ver `t7-templates.ts`). El test SEC-T-01 verifica el set exacto.
import type {
  SimulatedT7EmailInput,
  SimulatedT7EmailPort,
} from '../ports/simulated-t7-email.port.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { renderT7Template } from '../i18n/t7-templates.js';

/** Contrato mínimo del logger inyectable (los tests capturan sin depender de `console`). */
export interface T7EmailLogger {
  info(payload: Record<string, unknown>): void;
}

/** Set canónico de claves emitidas por `logEmail`. Test SEC-T-01 verifica igualdad exacta. */
export const T7_EMAIL_LOG_ALLOWED_KEYS: readonly string[] = [
  'event',
  'template',
  'correlationId',
  'to',
  'userId',
  'taskId',
  'eventId',
  'dueDate',
  'language',
  'subject',
  'body',
];

export class LoggingSimulatedT7EmailAdapter implements SimulatedT7EmailPort {
  constructor(private readonly log: T7EmailLogger = logger) {}

  logEmail(input: SimulatedT7EmailInput): void {
    const { subject, body } = renderT7Template(input.language, {
      taskId: input.taskId,
      dueDate: input.dueDate,
    });

    this.log.info({
      event: 'email_simulated',
      template: 'notif.t7',
      correlationId: input.correlationId,
      // `to` y `userId` referencian al destinatario por `userId` (no email — SEC-02).
      to: input.toUserId,
      userId: input.toUserId,
      taskId: input.taskId,
      eventId: input.eventId,
      dueDate: input.dueDate,
      language: input.language,
      subject,
      body,
    });
  }
}
