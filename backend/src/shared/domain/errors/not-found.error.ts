// Shared kernel — NotFoundError → HTTP 404 RESOURCE_NOT_FOUND (US-091 / BE-001; código
// canonicalizado en US-093 / BE-002 per ADR-API-002). Doc 14 §17.2.
// También usado para ownership masking: 404 enmascarado previene enumeración de IDs privados.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class NotFoundError extends AppError {
  readonly code = ErrorCodes.RESOURCE_NOT_FOUND;

  constructor(message = 'Resource not found') {
    super(message);
  }
}
