// US-028 (PB-P1-018 / BE-004) — Errores de dominio del `CreateEventTaskUseCase`.
// El error handler central mapea estas clases a HTTP + código de catálogo (ErrorCodes.*).
// `EventNotMutableError` se REUSA del módulo `bulk-confirm` — mismo mapeo 409 (Doc 16).
// `EventNotFoundError` no se define aquí: la no-revelación 404 se satisface con
// `NotFoundError` del shared kernel (mismo patrón que US-027 y US-031).
import { AppError } from '../../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../../shared/domain/errors/error-codes.js';

/**
 * 400 CATEGORY_NOT_AVAILABLE — `category_code` no existe o `is_active=false` (EC-06, VR-08).
 * Sin distinguir entre "inexistente" e "inactiva" para evitar enumeración de slugs.
 */
export class CategoryNotAvailableError extends AppError {
  readonly code = ErrorCodes.CATEGORY_NOT_AVAILABLE;
  readonly categoryCode: string;
  constructor(categoryCode: string) {
    super(`Category not available (code=${categoryCode})`);
    this.categoryCode = categoryCode;
  }
}

/**
 * 400 DUE_DATE_IN_PAST — Backup por si el use case necesita validar `due_date` fuera del schema
 * Zod (p. ej. re-check al momento del commit). En el flujo normal Zod ya lo captura y sale
 * como ValidationError. Se preserva para reuso en tests / paths alternos.
 */
export class DueDateInPastError extends AppError {
  readonly code = ErrorCodes.DUE_DATE_IN_PAST;
  constructor() {
    super('due_date must be greater than or equal to now()');
  }
}

/**
 * 415 UNSUPPORTED_MEDIA_TYPE — Content-Type ≠ `application/json` (EC-12).
 * Se lanza desde el controller antes de intentar parsear el body.
 */
export class UnsupportedMediaTypeError extends AppError {
  readonly code = ErrorCodes.UNSUPPORTED_MEDIA_TYPE;
  constructor() {
    super('Content-Type must be application/json');
  }
}
