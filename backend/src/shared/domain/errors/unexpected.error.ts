// Shared kernel — UnexpectedError → HTTP 500 INTERNAL_ERROR (US-093 / BE-001). Doc 14 §18.1.
// Error no mapeado. El `message` público es genérico; el `originalError` va solo al log interno.
import { ErrorCodes } from './error-codes.js';

export class UnexpectedError extends Error {
  readonly code = ErrorCodes.INTERNAL_ERROR;

  constructor(
    message = 'Error interno del servidor.',
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
