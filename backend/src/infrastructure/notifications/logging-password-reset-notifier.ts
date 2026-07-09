// Adapter — PasswordResetNotifier simulado por log (US-094 / OBS-001). MVP: no hay proveedor de
// email real (fuera de scope). Registra SOLO un evento de entrega simulada con `userId`; NUNCA
// loguea el token crudo ni el email (SEC-07). Los tests de integración inyectan un doble que
// captura el token para completar el flujo AC-06 → AC-07.
import type { PasswordResetNotifier } from '../../shared/auth/ports.js';
import { logger } from '../../shared/infrastructure/logger/index.js';

export class LoggingPasswordResetNotifier implements PasswordResetNotifier {
  deliver(input: { userId: string; email: string; rawToken: string }): Promise<void> {
    // El `rawToken` se recibe pero NO se loguea (SEC-07). Entrega simulada.
    logger.info({ event: 'auth.password_reset.delivery_simulated', userId: input.userId });
    return Promise.resolve();
  }
}
