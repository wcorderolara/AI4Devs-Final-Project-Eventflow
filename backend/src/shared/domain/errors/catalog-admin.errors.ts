// Errores comunes del CRUD admin de catálogos (`ServiceCategory` US-075 y `EventType` US-076).
// Una sola definición por `code` mantiene un único mapeo HTTP; los módulos los re-exportan
// desde su `domain/`.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

/**
 * 400 cuando `name_i18n` no contiene la clave `es-LATAM` con valor no vacío.
 * VR-03 + EC-05. Se valida en el UseCase para producir el código estable
 * (los DTOs Zod solo validan shape).
 */
export class InvalidNameI18nError extends AppError {
  readonly code = ErrorCodes.INVALID_NAME_I18N;
  override readonly httpStatus = 400;
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
  override readonly httpStatus = 400;
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
  override readonly httpStatus = 400;
  constructor(message = 'reason must be between 10 and 500 chars') {
    super(message);
  }
}
