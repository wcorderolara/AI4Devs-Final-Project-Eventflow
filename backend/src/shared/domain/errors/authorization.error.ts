// Shared kernel — AuthorizationError → HTTP 403 FORBIDDEN (US-093 / BE-002). Doc 14 §17.2/§18.1.
// Usuario autenticado sin permisos. Con `maskedAs404 = true` el errorHandlerMiddleware responde
// 404 RESOURCE_NOT_FOUND (masking IDOR para recursos privados; previene enumeración de IDs).
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class AuthorizationError extends AppError {
  readonly code = ErrorCodes.FORBIDDEN;

  constructor(
    message = 'Insufficient permissions',
    public readonly maskedAs404 = false,
  ) {
    super(message);
  }
}
