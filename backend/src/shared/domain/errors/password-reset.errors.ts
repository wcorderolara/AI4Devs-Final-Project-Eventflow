// Errores del reset de contraseña (US-004 / BE-003). Catálogo Decisión PO US-004:
// `400 TOKEN_INVALID` (hash no encontrado / token alterado), `400 TOKEN_USED` (consumed_at no
// nulo) y `410 GONE_TOKEN_EXPIRED` (expires_at vencido — TTL 30 min). Mensajes genéricos: no
// revelan el token ni detalles internos (SEC-06).
import { AppError } from './app.error.js';

/** Token alterado o inexistente → 400 TOKEN_INVALID (EC-03). */
export class TokenInvalidError extends AppError {
  readonly code = 'TOKEN_INVALID';

  constructor(message = 'The reset link is not valid.') {
    super(message);
  }
}

/** Token ya consumido (single-use) → 400 TOKEN_USED (EC-02). */
export class TokenUsedError extends AppError {
  readonly code = 'TOKEN_USED';

  constructor(message = 'The reset link has already been used.') {
    super(message);
  }
}

/** Token expirado (TTL 30 min) → 410 GONE_TOKEN_EXPIRED (EC-01). */
export class TokenExpiredError extends AppError {
  readonly code = 'GONE_TOKEN_EXPIRED';

  constructor(message = 'The reset link has expired.') {
    super(message);
  }
}
