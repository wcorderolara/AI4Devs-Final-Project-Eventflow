// Error — sesión activa en endpoint solo-anónimo (US-001 / SEC-01; formalizado por el catálogo
// de US-003: `409 ALREADY_AUTHENTICATED`). Un usuario autenticado que invoca register/login
// recibe conflicto explícito; el frontend redirige a su dashboard.
import { AppError } from './app.error.js';

export class AlreadyAuthenticatedError extends AppError {
  readonly code = 'ALREADY_AUTHENTICATED';

  constructor(message = 'There is already an active session.') {
    super(message);
  }
}
