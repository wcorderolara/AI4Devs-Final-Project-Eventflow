// Errores de dominio del CRUD admin de `EventType` (US-076 / BE-004..006).
// Tech Spec §7 Error Handling; Decisiones PO D4/D6/D7.
//
// Uniformidad: cada error extiende `AppError` con un `code` estable del catálogo y declara
// su status HTTP y `details` (`httpStatus` / `httpDetails()`); el `errorHandlerMiddleware`
// solo serializa el envelope.
//
// Diferencias vs US-075 (ServiceCategory):
//   - Sin jerarquía → no hay `InvalidHierarchyDepthError`, `EventTypeHasChildrenError`
//     ni `InvalidParentIdError`.
//   - Un solo guard en soft delete: `EXISTS events` (BR-EVENTTYPE-007) →
//     `EventTypeInUseError` con `details.usage_count`.
//
// Errores compartidos con US-075 (`InvalidNameI18nError`, `ReasonRequiredError`,
// `InvalidReasonLengthError`): se REUSAN las clases del módulo `service-catalog` en
// lugar de duplicarlas: duplicar la clase con el mismo `code` duplicaría también su
// mapeo HTTP. Reusar la clase mantiene un único punto de definición del `code` y del mapeo. El acoplamiento es un import puntual y
// documentado — no aporta lógica cruzada entre módulos.
import { AppError, type ErrorDetail, type HttpErrorMapping } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export {
  InvalidNameI18nError,
  ReasonRequiredError,
  InvalidReasonLengthError,
} from '../../service-catalog/domain/us075.errors.js';

/**
 * 404 uniforme cuando el EventType no existe o está soft-deleted. Decisión PO D7 +
 * SEC-05: response uniforme sin information leakage (paridad con
 * `SERVICE_CATEGORY_NOT_FOUND` de US-075).
 */
export class EventTypeNotFoundError extends AppError {
  readonly code = ErrorCodes.EVENT_TYPE_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Event type not found') {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Event type not found' };
  }
}

/**
 * 409 cuando se intenta hacer soft delete de un EventType con `events` asociados.
 * EC-01 + BR-EVENTTYPE-007. Expone `usage_count` en `details` para que el admin
 * decida (por ejemplo, migrar los eventos afectados primero, reactivar más tarde).
 */
export class EventTypeInUseError extends AppError {
  readonly code = ErrorCodes.EVENT_TYPE_IN_USE;
  override readonly httpStatus = 409;
  constructor(
    public readonly usageCount: number,
    message = 'Event type is in use by existing events',
  ) {
    super(message);
  }

  protected override httpDetails(): ErrorDetail[] {
    return [{ field: 'usage_count', message: String(this.usageCount) }];
  }
}

/**
 * 409 cuando el `code` ya existe (UNIQUE constraint). EC-02 + VR-02. Se detecta a
 * nivel aplicación antes del INSERT para evitar exponer errores UNIQUE al cliente
 * (patrón US-075). Reusa `DUPLICATE_CODE` — es el mismo code catálogo-wide.
 */
export class DuplicateEventTypeCodeError extends AppError {
  readonly code = ErrorCodes.DUPLICATE_CODE;
  override readonly httpStatus = 409;
  constructor(message = 'Event type code already exists') {
    super(message);
  }
}
