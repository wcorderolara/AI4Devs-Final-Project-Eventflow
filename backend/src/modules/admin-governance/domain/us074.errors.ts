// Errores de dominio del endpoint `GET /api/v1/admin/vendors` (US-074 / BE-002).
// El único error propio del listado es `INVALID_CURSOR` (EC-02). Todos los demás casos de
// validación (multi-status inválido, fechas invertidas, business_name fuera de rango,
// pageSize fuera [1..50]) los captura el schema Zod ⇒ `400 VALIDATION_ERROR` a nivel del
// middleware. Se reutiliza el código estable `INVALID_CURSOR` ya existente en el catálogo
// (introducido por US-045 y compartido con US-066/077) para no fragmentar el contrato.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class Us074InvalidCursorError extends AppError {
  readonly code = ErrorCodes.INVALID_CURSOR;
  constructor(message = 'Invalid cursor') {
    super(message);
  }
}
