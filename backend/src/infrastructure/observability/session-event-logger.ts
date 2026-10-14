// Eventos técnicos de sesión (US-108 / OBS-001). AC-07; §14 Observability & Audit.
// Emite eventos estructurados de ciclo de vida de la cookie de sesión con `correlationId` y, cuando
// se conoce, `userId`. NUNCA incluye el `sid`, la cookie ni secretos (el shape solo admite metadatos
// seguros; además el logger aplica redacción central). Nombres estables per Tech Spec §7/§14.
import { createEventLogger } from './event-logger.js';

export type SessionEventName =
  | 'session.cookie.issued'
  | 'session.cookie.cleared'
  | 'session.cookie.invalid'
  | 'session.config.invalid';

export interface SessionEventData {
  correlationId?: string;
  userId?: string;
  reason?: string;
}

/** Registra un evento de sesión con nivel `info` (invalid usa `warn`). Solo metadatos seguros. */
export const logSessionEvent = createEventLogger<SessionEventName, SessionEventData>({
  level: (event) =>
    event === 'session.cookie.invalid' || event === 'session.config.invalid' ? 'warn' : 'info',
  fields: ['correlationId', 'userId', 'reason'],
});
