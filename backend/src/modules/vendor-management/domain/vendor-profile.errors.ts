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

/** US-042 AC-02 / D1: category_change_count >= 5 al intentar mutar el set → 409. */
export class CategoryChangeLimitError extends AppError {
  readonly code = ErrorCodes.CATEGORY_CHANGE_LIMIT;
  constructor(message = 'Category change limit reached (max 5 changes)') {
    super(message);
  }
}

/** US-042 EC-04: cardinalidad inválida (0, >5, duplicados post-normalización) → 400. */
export class InvalidCategoriesError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORIES;
  constructor(message = 'service_category_ids must contain between 1 and 5 distinct UUIDs') {
    super(message);
  }
}

/**
 * US-042 EC-05: al menos una categoría no existe o está inactiva → 400. Incluye
 * `details.unknown_or_inactive[]` con los ids problemáticos.
 */
export class InvalidCategoryError extends AppError {
  readonly code = ErrorCodes.INVALID_CATEGORY;
  readonly unknownOrInactive: readonly string[];
  constructor(unknownOrInactive: readonly string[], message = 'One or more categories are unknown or inactive') {
    super(message);
    this.unknownOrInactive = unknownOrInactive;
  }
}
