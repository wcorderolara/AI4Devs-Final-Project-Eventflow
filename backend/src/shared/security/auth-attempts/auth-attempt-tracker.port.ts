// Puerto — contador de intentos fallidos de login por IP+email candidato (US-003 / BE-004).
// Decisión PO US-003 #1/#2: captcha condicional a partir de N=3 fallos consecutivos dentro de
// una ventana deslizante de 10 min; reset en login exitoso o al expirar la ventana. La clave
// compone IP + email normalizado (lowercase). El adapter por defecto es In-Memory (DB-001:
// sin persistencia nueva en MVP; migrar a tabla `auth_attempts` requiere decisión al escalar
// a multi-instancia).
export interface AuthAttemptTracker {
  /** Registra un fallo consecutivo para la combinación IP+email. */
  recordFailure(ip: string, email: string): void;
  /** ¿La combinación alcanzó el umbral N dentro de la ventana? */
  isCaptchaRequired(ip: string, email: string): boolean;
  /** Login exitoso → resetea el contador de la combinación. */
  resetOnSuccess(ip: string, email: string): void;
  /** Limpieza de entradas expiradas (se invoca de forma oportunista). */
  pruneExpired(): void;
}
