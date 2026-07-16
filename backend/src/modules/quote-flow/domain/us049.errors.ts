// Errores de dominio del endpoint `POST /api/v1/quote-requests` (US-049 / BE-004).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details` cuando aplica.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class EventNotFoundError extends AppError {
  readonly code = ErrorCodes.EVENT_NOT_FOUND;
  constructor(message = 'Event not found') {
    super(message);
  }
}

export class EventNotActiveError extends AppError {
  readonly code = ErrorCodes.EVENT_NOT_ACTIVE;
  constructor(
    public readonly eventStatus: string,
    message = 'Event is not active',
  ) {
    super(message);
  }
}

export class VendorNotAvailableError extends AppError {
  readonly code = ErrorCodes.VENDOR_NOT_AVAILABLE;
  constructor(message = 'Vendor is not available') {
    super(message);
  }
}

export class InvalidBriefError extends AppError {
  readonly code = ErrorCodes.INVALID_BRIEF;
  constructor(
    public readonly field: 'budget' | 'message',
    message = 'Invalid brief',
  ) {
    super(message);
  }
}

export class QuoteRequestAlreadyActiveError extends AppError {
  readonly code = ErrorCodes.QR_ALREADY_ACTIVE;
  constructor(
    public readonly existingQuoteRequestId: string,
    message = 'An active quote request already exists for this event/vendor',
  ) {
    super(message);
  }
}

export class QuoteRequestCategoryLimitReachedError extends AppError {
  readonly code = ErrorCodes.QR_CATEGORY_LIMIT_REACHED;
  constructor(
    public readonly activeCount: number,
    message = 'Quote request category limit reached',
  ) {
    super(message);
  }
}

/**
 * Servicio de categoría inexistente o inactivo — mapea a `400 INVALID_CATEGORY` (EC-04 / VR-04).
 * Independiente de `InvalidCategoryError` de vendor-management para respetar boundaries entre módulos.
 */
export class ServiceCategoryUnavailableError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORY;
  constructor(message = 'Service category is not available') {
    super(message);
  }
}
