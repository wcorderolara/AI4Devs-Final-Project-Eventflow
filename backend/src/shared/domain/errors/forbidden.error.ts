// Shared kernel — ForbiddenError → HTTP 403 (US-091 / BE-001). Doc 14 §17.2.
// Usuario autenticado pero sin permisos (rol insuficiente / origin CORS no permitido).
import { AppError } from './app.error.js';

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Insufficient permissions') {
    super(message);
  }
}
