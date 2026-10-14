// Errores de dominio del endpoint `POST /api/v1/vendor/quote-requests/:id/respond` (US-052).
// Mapean 1:1 a los códigos estables del contrato (§7 Tech Spec) y son consumidos por el
// `errorHandlerMiddleware` para serializar el envelope anidado con `details` cuando aplica.
import { AppError, type ErrorDetail, type HttpErrorMapping } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * QR ajena/inexistente/vendor `hidden`/soft-deleted — 404 QR_NOT_FOUND uniforme.
 * Compartido por US-051 (detalle + mark-viewed) y US-052 (respond). Reemplaza el
 * `NotFoundError` genérico en los flujos vendor-scoped para exponer un código estable
 * al frontend (`QR_NOT_FOUND`) alineado con los MSW handlers de FE-003.
 */
export class QrNotFoundError extends AppError {
  readonly code = ErrorCodes.QR_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Quote request not found') {
    super(message);
  }

  // 404 uniforme (US-051/US-052): QR ajena, inexistente o vendor hidden.
  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Quote request not found', masked: true };
  }
}

/** QR no responsable (estado ∉ {sent, viewed} o expiración lazy) — 409 QR_NOT_RESPONDABLE. */
export class QrNotRespondableError extends AppError {
  readonly code = ErrorCodes.QR_NOT_RESPONDABLE;
  override readonly httpStatus = 409;
  constructor(
    public readonly reason: 'status' | 'expired',
    public readonly detail: string,
    message = 'Quote request is not respondable',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: this.reason, message: this.detail }];
  }
}

/** Ya existe un Quote vigente para este QR (respeta `uq_quotes_request_active`) — 409. */
export class QuoteAlreadyExistsError extends AppError {
  readonly code = ErrorCodes.QUOTE_ALREADY_EXISTS;
  override readonly httpStatus = 409;
  constructor(
    public readonly existingQuoteId: string,
    message = 'An active quote already exists for this quote request',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'existing_quote_id', message: this.existingQuoteId }];
  }
}

/** `valid_until` fuera de rango (today..today+90) — 400 INVALID_VALID_UNTIL. */
export class InvalidValidUntilError extends AppError {
  readonly code = ErrorCodes.INVALID_VALID_UNTIL;
  override readonly httpStatus = 400;
  constructor(message = 'valid_until is out of range') {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'valid_until', message: 'out_of_range' }];
  }
}
