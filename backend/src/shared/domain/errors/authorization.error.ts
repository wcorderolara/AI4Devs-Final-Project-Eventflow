// Shared kernel — AuthorizationError → HTTP 403 FORBIDDEN (US-093 / BE-002). Doc 14 §17.2/§18.1.
// Usuario autenticado sin permisos. Con `maskedAs404 = true` responde 404 RESOURCE_NOT_FOUND
// (masking IDOR para recursos privados; previene enumeración de IDs).
import { AppError, type HttpErrorMapping } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class AuthorizationError extends AppError {
  readonly code = ErrorCodes.FORBIDDEN;
  override readonly httpStatus = 403;

  constructor(
    message = 'Insufficient permissions',
    public readonly maskedAs404 = false,
  ) {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    if (this.maskedAs404) {
      return { status: 404, code: ErrorCodes.RESOURCE_NOT_FOUND, message: 'Resource not found', masked: true };
    }
    return super.toHttp();
  }
}
