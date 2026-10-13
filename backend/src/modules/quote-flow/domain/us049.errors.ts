// Errores de dominio del endpoint `POST /api/v1/quote-requests` (US-049 / BE-004).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details` cuando aplica.
import { AppError, type ErrorDetail } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class EventNotFoundError extends AppError {
  readonly code = ErrorCodes.EVENT_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Event not found') {
    super(message);
  }
}

export class EventNotActiveError extends AppError {
  readonly code = ErrorCodes.EVENT_NOT_ACTIVE;
  override readonly httpStatus = 409;
  constructor(
    public readonly eventStatus: string,
    message = 'Event is not active',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'status', message: this.eventStatus }];
  }
}

export class VendorNotAvailableError extends AppError {
  readonly code = ErrorCodes.VENDOR_NOT_AVAILABLE;
  override readonly httpStatus = 400;
  constructor(message = 'Vendor is not available') {
    super(message);
  }
}

export class InvalidBriefError extends AppError {
  readonly code = ErrorCodes.INVALID_BRIEF;
  override readonly httpStatus = 400;
  constructor(
    public readonly field: 'budget' | 'message',
    message = 'Invalid brief',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: this.field, message: 'invalid' }];
  }
}

export class QuoteRequestAlreadyActiveError extends AppError {
  readonly code = ErrorCodes.QR_ALREADY_ACTIVE;
  override readonly httpStatus = 409;
  constructor(
    public readonly existingQuoteRequestId: string,
    message = 'An active quote request already exists for this event/vendor',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'existing_quote_request_id', message: this.existingQuoteRequestId }];
  }
}

export class QuoteRequestCategoryLimitReachedError extends AppError {
  readonly code = ErrorCodes.QR_CATEGORY_LIMIT_REACHED;
  override readonly httpStatus = 409;
  constructor(
    public readonly activeCount: number,
    message = 'Quote request category limit reached',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'active_count', message: String(this.activeCount) }];
  }
}

/**
 * Servicio de categoría inexistente o inactivo — mapea a `400 INVALID_CATEGORY` (EC-04 / VR-04).
 * Independiente de `InvalidCategoryError` de vendor-management para respetar boundaries entre módulos.
 */
export class ServiceCategoryUnavailableError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORY;
  override readonly httpStatus = 400;
  constructor(message = 'Service category is not available') {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'service_category_id', message: 'not_available' }];
  }
}
