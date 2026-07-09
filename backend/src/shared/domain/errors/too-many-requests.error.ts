// Shared kernel — TooManyRequestsError → HTTP 429 (US-091 / BE-001; re-basado en US-093 / BE-002).
// Alias histórico de RateLimitError (code RATE_LIMIT_EXCEEDED). La respuesta incluye `Retry-After`.
import { RateLimitError } from './rate-limit.error.js';

export class TooManyRequestsError extends RateLimitError {
  constructor(message = 'Too many requests') {
    super(undefined, message);
  }
}
