// US-080 / BE-002 — Errores de dominio del endpoint `GET /api/v1/admin/admin-actions`.
// El único error propio del listado es `INVALID_CURSOR` (EC-02). Los demás casos de
// validación (target_type inválido, fechas invertidas, admin_id/target_id no-UUID,
// pageSize fuera [1..50]) los captura el schema Zod ⇒ `400 VALIDATION_ERROR`. Se reutiliza
// el código estable `INVALID_CURSOR` del catálogo compartido con US-045/US-066/US-074/
// US-077/US-078 para no fragmentar el contrato.
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class Us080InvalidCursorError extends AppError {
  readonly code = ErrorCodes.INVALID_CURSOR;
  constructor(message = 'Invalid cursor') {
    super(message);
  }
}
