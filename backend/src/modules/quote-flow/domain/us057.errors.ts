// Errores de dominio del endpoint `GET /api/v1/events/:id/quotes/compare` (US-057 / BE-004).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope con `details`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * `categoryCode` requerido y no provisto — mapea a `400 INVALID_FILTERS` con
 * `details: [{field: 'categoryCode', message: 'required'}]` (D1 / EC-01).
 */
export class CompareQuotesCategoryRequiredError extends AppError {
  readonly code = ErrorCodes.INVALID_FILTERS;
  constructor(message = 'categoryCode is required') {
    super(message);
  }
}

/**
 * `categoryCode` inexistente o categoría con `is_active=false` — mapea a `400 INVALID_CATEGORY`
 * (EC-02). Se preserva un error dedicado en el módulo para evitar acoplamiento con la variante
 * de `vendor-management` (que enlaza IDs, no slugs) y para no cargar el `ServiceCategoryUnavailableError`
 * genérico existente con semántica de lookup por slug (US-057).
 */
export class CompareQuotesInvalidCategoryError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORY;
  constructor(
    public readonly categoryCode: string,
    message = 'Service category is not available',
  ) {
    super(message);
  }
}
