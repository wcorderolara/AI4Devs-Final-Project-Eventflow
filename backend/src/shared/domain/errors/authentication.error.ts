// Shared kernel — AuthenticationError → HTTP 401 AUTHENTICATION_REQUIRED (US-093 / BE-002).
// Doc 14 §17.2/§18.1. Identidad ausente o inválida (token ausente/expirado/firma inválida).
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class AuthenticationError extends AppError {
  readonly code = ErrorCodes.AUTHENTICATION_REQUIRED;

  constructor(message = 'Autenticación requerida') {
    super(message);
  }
}
