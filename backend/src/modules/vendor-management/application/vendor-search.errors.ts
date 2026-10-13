// Errores de dominio del directorio (US-045 / BE-004). Mapeados por el error handler global
// (`error-handler.middleware.ts`) a los códigos estables `INVALID_FILTERS` / `INVALID_CURSOR`.
import { AppError, type ErrorDetail } from '../../../shared/domain/errors/app.error.js';

export class InvalidFiltersError extends AppError {
  readonly code = 'INVALID_FILTERS';
  override readonly httpStatus = 400;

  constructor(public readonly invalid: string[]) {
    super('Invalid search filters');
  }

  protected override httpDetails(): ErrorDetail[] {
    return this.invalid.map((field) => ({ field, message: 'invalid' }));
  }
}

export class InvalidCursorError extends AppError {
  readonly code = 'INVALID_CURSOR';
  override readonly httpStatus = 400;

  constructor() {
    super('Invalid pagination cursor');
  }
}
