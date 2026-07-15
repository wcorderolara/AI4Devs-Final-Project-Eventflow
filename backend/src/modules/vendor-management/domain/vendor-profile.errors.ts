// Errores de dominio del módulo vendor-management (US-040 / EC-01..07).
// Mapean a códigos HTTP a través del `errorHandlerMiddleware`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/** EC-01: el vendor ya tiene un VendorProfile activo (UNIQUE user_id) → 409 PROFILE_EXISTS. */
export class VendorProfileAlreadyExistsError extends AppError {
  readonly code = ErrorCodes.PROFILE_EXISTS;
  constructor(message = 'Vendor profile already exists for this user') {
    super(message);
  }
}
