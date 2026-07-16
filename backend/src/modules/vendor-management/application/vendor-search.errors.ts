// Errores de dominio del directorio (US-045 / BE-004). Mapeados por el error handler global
// (`error-handler.middleware.ts`) a los códigos estables `INVALID_FILTERS` / `INVALID_CURSOR`.
import { AppError } from '../../../shared/domain/errors/app.error.js';

export class InvalidFiltersError extends AppError {
  readonly code = 'INVALID_FILTERS';

  constructor(public readonly invalid: string[]) {
    super('Invalid search filters');
  }
}

export class InvalidCursorError extends AppError {
  readonly code = 'INVALID_CURSOR';

  constructor() {
    super('Invalid pagination cursor');
  }
}
