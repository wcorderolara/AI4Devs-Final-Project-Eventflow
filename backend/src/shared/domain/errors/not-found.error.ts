// Shared kernel — NotFoundError → HTTP 404 (US-091 / BE-001). Doc 14 §17.2.
// También usado para ownership masking: 404 enmascarado previene enumeración de IDs privados.
import { AppError } from './app.error.js';

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
  }
}
