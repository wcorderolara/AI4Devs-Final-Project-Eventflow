// US-078 / BE-002 — Errores de dominio del endpoint `GET /api/v1/admin/events`.
// El único error propio del listado es `INVALID_CURSOR` (EC-04). Todos los demás casos de
// validación (multi-status inválido, fechas invertidas, organizer_search fuera de rango,
// pageSize fuera [1..50]) los captura el schema Zod ⇒ `400 VALIDATION_ERROR` a nivel del
// middleware. Se reutiliza el código estable `INVALID_CURSOR` del catálogo (compartido con
// US-045/US-066/US-074/US-077) para no fragmentar el contrato.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class Us078InvalidCursorError extends AppError {
  readonly code = ErrorCodes.INVALID_CURSOR;
  constructor(message = 'Invalid cursor') {
    super(message);
  }
}
