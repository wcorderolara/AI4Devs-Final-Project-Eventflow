// Shared kernel — AuthorizationError (US-090 / BE-002). Doc 14 §7.1.
// Error de dominio para reglas de negocio de autorización (p. ej. "no puede editar este evento").
// No es el error HTTP 401/403 — ese mapping ocurre en los middlewares de US-091.
import { AppError } from './app.error.js';

export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
}
