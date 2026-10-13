// Errores de dominio del CRUD admin de `ServiceCategory` (US-075 / BE-004..006).
// Tech Spec §7 Error Handling; Decisiones PO D4/D5/D9. Mapeo 1:1 con `error-codes.ts`.
//
// Uniformidad: cada error extiende `AppError` con un `code` estable del catálogo y declara
// su status HTTP y `details` (`httpStatus` / `httpDetails()`); el `errorHandlerMiddleware`
// solo serializa el envelope.
import { AppError, type ErrorDetail, type HttpErrorMapping } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

// Errores comunes del CRUD admin de catálogos (compartidos con US-076 event-catalog).
export {
  InvalidNameI18nError,
  ReasonRequiredError,
  InvalidReasonLengthError,
} from '../../../shared/domain/errors/catalog-admin.errors.js';

/**
 * 404 uniforme cuando la categoría no existe o está soft-deleted. Decisión PO D9 +
 * SEC-05: response uniforme sin information leakage; el admin puede ver todas las
 * categorías (`sees-all`), por lo que este código específico NO leakea nada más allá
 * de lo que ya expone el panel (paridad con `REVIEW_NOT_FOUND` / `VENDOR_NOT_FOUND`).
 */
export class ServiceCategoryNotFoundError extends AppError {
  readonly code = ErrorCodes.SERVICE_CATEGORY_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Service category not found') {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Service category not found' };
  }
}

/**
 * 409 cuando se intenta crear/mover una categoría a un nivel > 2 (Decisión PO D4 /
 * BR-SERVICE-005). Casos: EC-01 (crear con parent ya-hijo), EC-02 (asignar parent a
 * root con children). El CHECK SQL `depth_level BETWEEN 1 AND 2` es la segunda línea
 * de defensa; el UseCase es la primera.
 */
export class InvalidHierarchyDepthError extends AppError {
  readonly code = ErrorCodes.INVALID_HIERARCHY_DEPTH;
  override readonly httpStatus = 409;
  constructor(message = 'Service category hierarchy depth exceeded') {
    super(message);
  }
}

/**
 * 409 cuando el `code` ya existe (UNIQUE constraint). EC-06 + VR-02. Se detecta a
 * nivel aplicación antes del INSERT para evitar exponer errores de FK/UNIQUE al
 * cliente (patrón US-040/US-044). Si escapa, `P2002` se mapea igual.
 */
export class DuplicateCategoryCodeError extends AppError {
  readonly code = ErrorCodes.DUPLICATE_CODE;
  override readonly httpStatus = 409;
  constructor(message = 'Service category code already exists') {
    super(message);
  }
}

/**
 * 409 al hacer soft delete de una categoría con `vendor_services` asociados. EC-03 +
 * BR-SERVICE-007. Expone `usage_count` en `details` para que el admin decida (mover
 * los servicios primero, reactivar más tarde, etc.).
 */
export class CategoryInUseError extends AppError {
  readonly code = ErrorCodes.CATEGORY_IN_USE;
  override readonly httpStatus = 409;
  constructor(
    public readonly usageCount: number,
    message = 'Service category is in use by vendor services',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'usage_count', message: String(this.usageCount) }];
  }
}

/**
 * 409 al hacer soft delete de una categoría root con subcategorías activas. EC-04 +
 * BR-SERVICE-007. Expone `children_count` en `details`. El admin debe desactivar los
 * hijos primero (soft delete propagativo NO existe en el MVP).
 */
export class CategoryHasChildrenError extends AppError {
  readonly code = ErrorCodes.CATEGORY_HAS_CHILDREN;
  override readonly httpStatus = 409;
  constructor(
    public readonly childrenCount: number,
    message = 'Service category has active subcategories',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'children_count', message: String(this.childrenCount) }];
  }
}

/**
 * 400 cuando el `parent_id` referenciado no existe. VR-05. Se detecta antes del
 * INSERT/UPDATE para no acoplar el UseCase al mapeo de errores Prisma.
 */
export class InvalidParentIdError extends AppError {
  readonly code = ErrorCodes.INVALID_PARENT_ID;
  override readonly httpStatus = 400;
  constructor(message = 'Parent service category does not exist') {
    super(message);
  }
}
