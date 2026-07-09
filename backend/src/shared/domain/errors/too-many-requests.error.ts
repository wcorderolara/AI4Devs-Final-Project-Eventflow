// Shared kernel — TooManyRequestsError → HTTP 429 (US-091 / BE-001). ADR-SEC-004.
// Rate limit excedido; la respuesta incluye cabecera `Retry-After`.
import { AppError } from './app.error.js';

export class TooManyRequestsError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests') {
    super(message);
  }
}
