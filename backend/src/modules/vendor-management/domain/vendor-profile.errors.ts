// Errores de dominio del módulo vendor-management (US-040 / EC-01..07 y US-041 / EC-01..08).
// Mapean a códigos HTTP a través del `errorHandlerMiddleware`.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/** US-040 EC-01: el vendor ya tiene un VendorProfile activo (UNIQUE user_id) → 409. */
export class VendorProfileAlreadyExistsError extends AppError {
  readonly code = ErrorCodes.PROFILE_EXISTS;
  constructor(message = 'Vendor profile already exists for this user') {
    super(message);
  }
}

/** US-041 NT-10: currentUser sin VendorProfile activo → 404. */
export class VendorProfileNotFoundError extends AppError {
  readonly code = ErrorCodes.PROFILE_NOT_FOUND;
  constructor(message = 'Vendor profile not found') {
    super(message);
  }
}

/** US-041 EC-03 / D3: PATCH bloqueado cuando status='rejected' → 409. */
export class VendorProfileRejectedError extends AppError {
  readonly code = ErrorCodes.PROFILE_REJECTED;
  constructor(message = 'Profile was rejected — submit for approval to re-open editing') {
    super(message);
  }
}

/** US-041 EC-04 / D3: PATCH y DELETE bloqueados cuando status='hidden' → 409. */
export class VendorProfileHiddenError extends AppError {
  readonly code = ErrorCodes.PROFILE_HIDDEN;
  constructor(message = 'Profile is hidden — contact an administrator') {
    super(message);
  }
}

/** US-041 EC-05: DELETE sobre perfil ya soft-deleted → 409. */
export class VendorProfileAlreadyDeletedError extends AppError {
  readonly code = ErrorCodes.PROFILE_DELETED;
  constructor(message = 'Profile is already deleted') {
    super(message);
  }
}
