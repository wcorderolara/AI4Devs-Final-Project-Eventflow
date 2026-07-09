// Shared kernel — ValidationError (US-090 / BE-002). Doc 14 §7.1.
// Acepta detalles por campo, compatible con el envelope de error de US-091.
import { AppError } from './app.error.js';

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';

  constructor(
    message: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}
