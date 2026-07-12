// Error — método HTTP no permitido en la ruta (US-005 / EC-03: `GET /auth/logout` → 405).
// Manejo acotado por ruta (no existía handler 405 global en PB-P0-004 — nota N4 del record).
import { AppError } from './app.error.js';

export class MethodNotAllowedError extends AppError {
  readonly code = 'METHOD_NOT_ALLOWED';

  constructor(message = 'Method not allowed.') {
    super(message);
  }
}
