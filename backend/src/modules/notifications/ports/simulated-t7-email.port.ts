// US-034 (PB-P2-004 / BE-005). Puerto `SimulatedT7EmailPort`. Materializa el patrón
// `[EMAIL]` de NFR-OBS-004 sin PII (SEC-02): sólo se emiten `subject` y `body`
// localizados a partir de plantillas cuyos únicos placeholders permitidos son
// `taskId` y `dueDate`. El `to` es el `userId` del destinatario (nunca el email).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface SimulatedT7EmailInput {
  /** ID del destinatario (nunca el email — SEC-02 no-PII). */
  toUserId: string;
  taskId: string;
  eventId: string;
  /** ISO date `YYYY-MM-DD`. */
  dueDate: string;
  language: SupportedLanguage;
  correlationId: string;
}

export interface SimulatedT7EmailPort {
  /** Emite un log estructurado `event='email_simulated'` con el template T-7 resuelto. */
  logEmail(input: SimulatedT7EmailInput): void;
}
