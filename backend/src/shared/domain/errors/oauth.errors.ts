// Errores de dominio del flujo OAuth Google (US-008 / PB-P4-001). Todos extienden `AppError`
// y mapean a HTTP en `errorHandlerMiddleware`. Regla de seguridad (SEC-05 / VR-01/VR-02): el
// `message` que llega al usuario es SIEMPRE neutro; el detalle real (`reason`) NO se serializa —
// se usa solo para el log de observabilidad `auth.oauth.google.failure` (redactado, sin PII/token).
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

/** Mensaje neutro estándar de fallo de autenticación OAuth (nunca revela la causa). */
export const OAUTH_NEUTRAL_MESSAGE = 'No fue posible iniciar sesión';
/** Mensaje neutro estándar de fallo al completar un paso de continuación. */
export const OAUTH_CONTINUATION_NEUTRAL_MESSAGE = 'No fue posible completar';

/** `state`/`nonce` ausente, alterado o expirado (SEC-03, NT-02). */
export class OAuthStateInvalidError extends AppError {
  readonly code = ErrorCodes.OAUTH_STATE_INVALID;
  /** Causa interna para el log (no se expone al cliente). */
  readonly reason: string;

  constructor(reason = 'state_invalid') {
    super(OAUTH_NEUTRAL_MESSAGE);
    this.reason = reason;
  }
}

/**
 * Falla de verificación del `id_token` (firma/`aud`/`iss`/`exp`/`nonce` inválidos) o
 * `email_verified=false` (VR-01/VR-02, EC-01, NT-01/NT-03). Un único código neutro cubre todas
 * las causas para no filtrar cuál falló; el `reason` interno se registra en el log.
 */
export class OAuthVerificationError extends AppError {
  readonly code = ErrorCodes.OAUTH_VERIFICATION_FAILED;
  readonly reason: string;

  constructor(reason = 'id_token_invalid') {
    super(OAUTH_NEUTRAL_MESSAGE);
    this.reason = reason;
  }
}

/** `google_sub` ya vinculado a otra cuenta, o el email tiene otra identidad Google (409). */
export class OAuthAccountConflictError extends AppError {
  readonly code = ErrorCodes.OAUTH_ACCOUNT_CONFLICT;
  readonly reason: string;

  constructor(reason = 'account_conflict') {
    super(OAUTH_NEUTRAL_MESSAGE);
    this.reason = reason;
  }
}

/** Token de continuación (selección de rol / confirmación de vinculación) inválido o expirado (410). */
export class OAuthContinuationInvalidError extends AppError {
  readonly code = ErrorCodes.OAUTH_CONTINUATION_INVALID;
  readonly reason: string;

  constructor(reason = 'continuation_invalid') {
    super(OAUTH_CONTINUATION_NEUTRAL_MESSAGE);
    this.reason = reason;
  }
}
