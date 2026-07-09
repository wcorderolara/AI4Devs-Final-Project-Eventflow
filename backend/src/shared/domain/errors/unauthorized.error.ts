// Shared kernel — UnauthorizedError → HTTP 401 (US-091 / BE-001). Doc 14 §17.2.
// Identidad ausente o inválida (token ausente/expirado/firma inválida). Nunca 403.
import { AppError } from './app.error.js';

export class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Authentication required') {
    super(message);
  }
}
