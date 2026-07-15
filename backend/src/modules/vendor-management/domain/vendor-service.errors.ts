// Errores de dominio — US-044 (PB-P1-027) CRUD `VendorService`.
// Se mapean a HTTP en `errorHandlerMiddleware`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/** VR-01 / EC-05: `package_name` fuera de [2..150] → 400. */
export class InvalidPackageNameError extends AppError {
  readonly code = ErrorCodes.INVALID_PACKAGE_NAME;
  constructor(message = 'package_name must be between 2 and 150 characters') {
    super(message);
  }
}

/** VR-02 / EC-01: `base_price` negativo → 400. */
export class InvalidPriceError extends AppError {
  readonly code = ErrorCodes.INVALID_PRICE;
  constructor(message = 'base_price must be non-negative with up to 2 decimals') {
    super(message);
  }
}

/** VR-04 / EC-03: `currency_code` fuera del enum → 400. */
export class InvalidCurrencyError extends AppError {
  readonly code = ErrorCodes.INVALID_CURRENCY;
  constructor(message = 'currency_code must be one of GTQ, EUR, MXN, COP, USD') {
    super(message);
  }
}

/** VR-06 / EC-05: `description` fuera de [10..2000] → 400. */
export class InvalidDescriptionError extends AppError {
  readonly code = ErrorCodes.INVALID_DESCRIPTION;
  constructor(message = 'description must be between 10 and 2000 characters') {
    super(message);
  }
}

/** VR-05 / EC-04: excedido el cap de 50 activos por vendor → 409. */
export class VendorServiceLimitReachedError extends AppError {
  readonly code = ErrorCodes.SERVICE_LIMIT_REACHED;
  constructor(message = 'Vendor service active limit reached (max 50)') {
    super(message);
  }
}

/** SEC-04 / EC-08: servicio inexistente o ajeno al vendor autenticado → 404. */
export class VendorServiceNotFoundError extends AppError {
  readonly code = ErrorCodes.SERVICE_NOT_FOUND;
  constructor(message = 'Vendor service not found') {
    super(message);
  }
}
