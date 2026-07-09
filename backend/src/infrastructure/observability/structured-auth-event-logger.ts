// Adapter — AuthEventLogger estructurado (US-094 / OBS-001). Emite eventos de seguridad de auth
// con `correlationId` y `userId` cuando se conocen. NUNCA incluye password, hash, token, cookie ni
// captcha token (SEC-07): el shape del evento solo admite metadatos seguros.
import type { AuthEventLogger, AuthEventName } from '../../shared/auth/ports.js';
import { logger } from '../../shared/infrastructure/logger/index.js';

export class StructuredAuthEventLogger implements AuthEventLogger {
  emit(
    event: AuthEventName,
    data: { correlationId?: string; userId?: string; reason?: string },
  ): void {
    logger.info({
      event,
      correlationId: data.correlationId,
      userId: data.userId,
      reason: data.reason,
    });
  }
}
