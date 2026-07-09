// Shared kernel — ConflictError → HTTP 409 CONFLICT (US-093 / BE-002). Doc 14 §18.1.
// Estado conflictivo: duplicado, transición de estado inválida, etc.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class ConflictError extends AppError {
  readonly code = ErrorCodes.CONFLICT;

  constructor(message = 'Conflict') {
    super(message);
  }
}
