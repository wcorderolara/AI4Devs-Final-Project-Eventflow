// Adapter — AuthEventLogger estructurado (US-094 / OBS-001). Emite eventos de seguridad de auth
// con `correlationId` y `userId` cuando se conocen. NUNCA incluye password, hash, token, cookie ni
// captcha token (SEC-07): el shape del evento solo admite metadatos seguros.
import type { AuthEventLogger } from '../../shared/auth/ports.js';
import { createEventLogger } from './event-logger.js';

export class StructuredAuthEventLogger implements AuthEventLogger {
  emit: AuthEventLogger['emit'] = createEventLogger({
    level: () => 'info',
    fields: ['correlationId', 'userId', 'reason', 'latencyMs', 'role'],
  });
}
