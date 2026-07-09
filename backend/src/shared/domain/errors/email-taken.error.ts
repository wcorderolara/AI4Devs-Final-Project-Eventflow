// Shared kernel — EmailTakenError → HTTP 409 EMAIL_TAKEN (US-094 / BE-004). EC-02, NT-02.
// Conflicto específico: intento de registrar un email ya existente (normalizado a lowercase).
// El mensaje es genérico y no revela más contexto del necesario.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class EmailTakenError extends AppError {
  readonly code = ErrorCodes.EMAIL_TAKEN;

  constructor(message = 'Email already registered') {
    super(message);
  }
}
