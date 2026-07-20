// Errores de dominio del CRUD admin de `ServiceCategory` (US-075 / BE-004..006).
// Tech Spec §7 Error Handling; Decisiones PO D4/D5/D9. Mapeo 1:1 con `error-codes.ts`.
//
// Uniformidad: cada error extiende `AppError` con un `code` estable del catálogo. El
// mapeo a HTTP status lo hace `errorHandlerMiddleware`. Los `details` que enriquecen
// el envelope de respuesta se exponen como propiedades públicas para que el handler
// las serialice sin acoplar el dominio al transporte.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * 404 uniforme cuando la categoría no existe o está soft-deleted. Decisión PO D9 +
 * SEC-05: response uniforme sin information leakage; el admin puede ver todas las
 * categorías (`sees-all`), por lo que este código específico NO leakea nada más allá
 * de lo que ya expone el panel (paridad con `REVIEW_NOT_FOUND` / `VENDOR_NOT_FOUND`).
 */
export class ServiceCategoryNotFoundError extends AppError {
  readonly code = ErrorCodes.SERVICE_CATEGORY_NOT_FOUND;
  constructor(message = 'Service category not found') {
    super(message);
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
  constructor(
    public readonly usageCount: number,
    message = 'Service category is in use by vendor services',
  ) {
    super(message);
  }
}

/**
 * 409 al hacer soft delete de una categoría root con subcategorías activas. EC-04 +
 * BR-SERVICE-007. Expone `children_count` en `details`. El admin debe desactivar los
 * hijos primero (soft delete propagativo NO existe en el MVP).
 */
export class CategoryHasChildrenError extends AppError {
  readonly code = ErrorCodes.CATEGORY_HAS_CHILDREN;
  constructor(
    public readonly childrenCount: number,
    message = 'Service category has active subcategories',
  ) {
    super(message);
  }
}

/**
 * 400 cuando el `parent_id` referenciado no existe. VR-05. Se detecta antes del
 * INSERT/UPDATE para no acoplar el UseCase al mapeo de errores Prisma.
 */
export class InvalidParentIdError extends AppError {
  readonly code = ErrorCodes.INVALID_PARENT_ID;
  constructor(message = 'Parent service category does not exist') {
    super(message);
  }
}

/**
 * 400 cuando `name_i18n` no contiene la clave `es-LATAM` con valor no vacío.
 * VR-03 + EC-05. Se valida en el UseCase para producir el código estable
 * (los DTOs Zod solo validan shape).
 */
export class InvalidNameI18nError extends AppError {
  readonly code = ErrorCodes.INVALID_NAME_I18N;
  constructor(message = "name_i18n['es-LATAM'] is required") {
    super(message);
  }
}

/**
 * 400 cuando `reason` es requerido y está ausente / vacío (VR-10 en DELETE).
 * Es distinto de `INVALID_REASON_LENGTH` para que la UI muestre el mensaje correcto.
 */
export class ReasonRequiredError extends AppError {
  readonly code = ErrorCodes.REASON_REQUIRED;
  constructor(message = 'reason is required') {
    super(message);
  }
}

/**
 * 400 cuando `reason` está presente pero fuera del rango [10..500] chars (VR-10).
 * El controller ya rechazó los valores > 500 con Zod; este error cubre el < 10.
 */
export class InvalidReasonLengthError extends AppError {
  readonly code = ErrorCodes.INVALID_REASON_LENGTH;
  constructor(message = 'reason must be between 10 and 500 chars') {
    super(message);
  }
}
