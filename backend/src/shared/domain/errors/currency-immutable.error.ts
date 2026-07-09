// Shared kernel — CurrencyImmutableError → HTTP 409 CURRENCY_IMMUTABLE (US-095 / BE-002).
// AC-05, NT-08, VR-07: `currencyCode` se fija al crear el evento y no puede cambiarse por PATCH.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class CurrencyImmutableError extends AppError {
  readonly code = ErrorCodes.CURRENCY_IMMUTABLE;

  constructor(message = 'Currency cannot be changed after event creation') {
    super(message);
  }
}
