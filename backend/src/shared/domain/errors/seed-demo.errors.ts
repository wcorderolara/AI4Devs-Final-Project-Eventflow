// Shared kernel — Errores del reset surgical Demo (US-086 / PB-P0-014). Doc 14 §18.
// `SeedResetInProgressError` → 409 (concurrencia, EC-03). `SeedResetFailedError` → 500 (falla
// parcial durante limpieza/repoblado, EC-02). Viven en el shared kernel porque el
// `errorHandlerMiddleware` (shared/interface) debe poder hacer `instanceof` sin cruzar el boundary
// de módulos (ADR-ARCH-001): el módulo `seed-demo` no es importable desde shared.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

/** Ya hay un reset en curso: segundo caller concurrente → 409 `seed_reset_in_progress` (EC-03). */
export class SeedResetInProgressError extends AppError {
  readonly code = ErrorCodes.SEED_RESET_IN_PROGRESS;

  constructor(message = 'A seed reset is already in progress') {
    super(message);
  }
}

/** Falla durante la limpieza surgical o el repoblado → 500 `seed_reset_failed` (EC-02). */
export class SeedResetFailedError extends AppError {
  readonly code = ErrorCodes.SEED_RESET_FAILED;

  constructor(message = 'Seed reset failed') {
    super(message);
  }
}
