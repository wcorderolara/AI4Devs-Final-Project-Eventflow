// Errores de dominio — US-022 (PB-P2-001 / AI-006). Mapean 1:1 a los códigos estables del contrato
// del endpoint `POST /events/:eventId/ai/quote-summary` (Tech Spec §7 Error Handling).
import { AppError, type ErrorDetail } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * Categoría (`category_code`) inexistente o inactiva — mapea a `400 INVALID_CATEGORY` con
 * `details: [{field: 'categoryCode', message: '<code>'}]`. Idéntico shape que el error del
 * comparador de US-057; sin embargo se define aquí para preservar el boundary ADR-ARCH-001
 * (el use case no importa clases de `quote-flow`).
 */
export class Us022InvalidCategoryError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORY;
  override readonly httpStatus = 400;
  constructor(
    public readonly categoryCode: string,
    message = 'Service category is not available',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'categoryCode', message: this.categoryCode }];
  }
}

/**
 * `category_code` requerido y no provisto — mapea a `400 INVALID_FILTERS` con
 * `details: [{field: 'category_code', message: 'required'}]` (D1 / EC-02).
 */
export class Us022CategoryCodeRequiredError extends AppError {
  readonly code = ErrorCodes.INVALID_FILTERS;
  override readonly httpStatus = 400;
  constructor(message = 'category_code is required') {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'category_code', message: 'required' }];
  }
}

/**
 * Menos de dos quotes activas elegibles en la categoría — mapea a `400 INSUFFICIENT_QUOTES`
 * con `details: [{field: 'eligible_count', message: '<count>'}]` (VR-02 / EC-01).
 */
export class Us022InsufficientQuotesError extends AppError {
  readonly code = ErrorCodes.INSUFFICIENT_QUOTES;
  override readonly httpStatus = 400;
  constructor(
    public readonly eligibleCount: number,
    message = 'At least two eligible quotes are required to generate the AI comparison summary',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'eligible_count', message: String(this.eligibleCount) }];
  }
}
