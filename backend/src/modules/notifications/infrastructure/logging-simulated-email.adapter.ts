// Adapter genérico de `SimulatedEmailPort<TInput>`, configurado por tipo con un
// `SimulatedEmailSpec` (ver `notification-channels.ts`). Materializa el patrón `[EMAIL]`
// de NFR-OBS-004 como log estructurado `event='email_simulated'` (mismo canal que
// `LoggingWelcomeEmailNotifier` — US-001).
//
// Contrato SEC-02 (no-PII): el log incluye EXCLUSIVAMENTE las claves de
// `emailLogAllowedKeys(spec)`; nunca email, displayName ni textos libres del usuario. El
// `subject`/`body` vienen de plantillas cuyos placeholders son sólo IDs/códigos.
import type { SimulatedEmailInput, SimulatedEmailPort } from '../ports/notification-channels.port.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { StringKeys } from './prisma-notification.repository.js';

/** Contrato mínimo del logger inyectable (los tests capturan sin depender de `console`). */
export interface SimulatedEmailLogger {
  info(payload: Record<string, unknown>): void;
}

export interface SimulatedEmailSpec<TInput extends SimulatedEmailInput> {
  /** Clave del template (`notif.<tipo>`), fija o derivada del input. */
  template: string | ((input: TInput) => string);
  /** Campos del input logueados entre `userId` y `language`, en este orden. */
  fields: readonly StringKeys<TInput>[];
  render(input: TInput): { subject: string; body: string };
}

/** Set canónico (y orden) de claves emitidas por `logEmail`. */
export function emailLogAllowedKeys<TInput extends SimulatedEmailInput>(
  spec: SimulatedEmailSpec<TInput>,
): readonly string[] {
  return ['event', 'template', 'correlationId', 'to', 'userId', ...spec.fields, 'language', 'subject', 'body'];
}

export class LoggingSimulatedEmailAdapter<TInput extends SimulatedEmailInput>
  implements SimulatedEmailPort<TInput>
{
  constructor(
    private readonly spec: SimulatedEmailSpec<TInput>,
    private readonly log: SimulatedEmailLogger = logger,
  ) {}

  logEmail(input: TInput): void {
    const { template, fields, render } = this.spec;
    const { subject, body } = render(input);
    this.log.info({
      event: 'email_simulated',
      template: typeof template === 'function' ? template(input) : template,
      correlationId: input.correlationId,
      // `to` y `userId` referencian al destinatario por `userId` (no email — SEC-02).
      to: input.toUserId,
      userId: input.toUserId,
      ...Object.fromEntries(fields.map((k) => [k, input[k]])),
      language: input.language,
      subject,
      body,
    });
  }
}
