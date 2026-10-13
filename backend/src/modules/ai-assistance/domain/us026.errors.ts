// US-026 (PB-P2-003) — Errores de dominio de regeneración cross-cutting.
//
// El 404 de "parent no encontrado" y "auth mismatch" reutiliza el `NotFoundError` compartido
// (SEC-02 uniforme). El único código nuevo es `REGENERATION_LIMIT` (429 con
// `details: {current_count, max}`), declarado en la propia clase.
import { AppError, type ErrorDetail } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class Us026RegenerationLimitError extends AppError {
  readonly code = ErrorCodes.REGENERATION_LIMIT;
  override readonly httpStatus = 429;
  constructor(
    public readonly currentCount: number,
    public readonly max: number,
    message = 'Regeneration limit reached for this AI recommendation lineage',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [
      { field: 'current_count', message: String(this.currentCount) },
      { field: 'max', message: String(this.max) },
    ];
  }
}
