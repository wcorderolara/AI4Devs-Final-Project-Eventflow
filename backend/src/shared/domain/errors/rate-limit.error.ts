// Shared kernel — RateLimitError → HTTP 429 RATE_LIMIT_EXCEEDED (US-093 / BE-002). ADR-SEC-004.
// `retryAfterSeconds` opcional → el errorHandlerMiddleware emite la cabecera `Retry-After`.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class RateLimitError extends AppError {
  readonly code = ErrorCodes.RATE_LIMIT_EXCEEDED;

  constructor(
    public readonly retryAfterSeconds?: number,
    message = 'Too many requests',
  ) {
    super(message);
  }
}
