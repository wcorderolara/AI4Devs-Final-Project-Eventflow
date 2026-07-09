// Shared kernel — errores de dominio del flujo Quote/Booking (US-096 / BE-002).
// `MaxQuoteRequestsExceededError`/`DuplicateQuoteRequestActiveError` → 409; `QuoteExpiredError` → 410.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class MaxQuoteRequestsExceededError extends AppError {
  readonly code = ErrorCodes.MAX_QUOTE_REQUESTS_EXCEEDED;
  constructor(message = 'Maximum active quote requests exceeded for this event/category') {
    super(message);
  }
}

export class DuplicateQuoteRequestActiveError extends AppError {
  readonly code = ErrorCodes.DUPLICATE_QUOTE_REQUEST_ACTIVE;
  constructor(message = 'An active quote request already exists for this event/vendor') {
    super(message);
  }
}

export class QuoteExpiredError extends AppError {
  readonly code = ErrorCodes.QUOTE_EXPIRED;
  constructor(message = 'Quote has expired') {
    super(message);
  }
}
