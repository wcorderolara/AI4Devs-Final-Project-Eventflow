// Adapter — WelcomeEmailNotifier simulado (US-001 / OBS-001). Conventions §15: email simulado
// como log estructurado `event='email_simulated'` con template y destinatario REDACTADO
// (local-part truncado; SEC-07 / §12 Sensitive Data). Nunca incluye tokens ni contraseñas.
import type { WelcomeEmailNotifier } from '../../shared/auth/ports.js';
import { logger } from '../../shared/infrastructure/logger/index.js';

/** Redacta un email para logs: conserva 2 chars del local-part y el dominio (`ka***@dominio`). */
export function redactEmailForLog(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export class LoggingWelcomeEmailNotifier implements WelcomeEmailNotifier {
  deliver(input: {
    userId: string;
    email: string;
    role: 'organizer' | 'vendor';
    correlationId?: string;
  }): Promise<void> {
    logger.info({
      event: 'email_simulated',
      template: `welcome.${input.role}`,
      to: redactEmailForLog(input.email),
      userId: input.userId,
      correlationId: input.correlationId,
    });
    return Promise.resolve();
  }
}
