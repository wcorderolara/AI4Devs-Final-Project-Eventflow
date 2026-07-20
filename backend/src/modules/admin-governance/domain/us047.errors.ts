// Errores de dominio del endpoint `POST /api/v1/admin/vendors/:id/moderate` (US-047 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (Tech Spec §7 Error Handling; Decisiones PO
// D5/D7).
//
// - `VendorNotFoundForModerationError` → `404 VENDOR_NOT_FOUND` uniforme (Decisión PO D7;
//   SEC-03). Se reutiliza el código ya existente en el catálogo (introducido por US-046 para
//   el detalle público) porque el admin está autorizado a ver el estado del vendor (D3 US-045
//   `admin sees-all` no se implementa en US-047 pero el efecto es equivalente): exponer un
//   código específico de dominio vendor no revela información privada.
// - `InvalidVendorTransitionError` → `409 INVALID_TRANSITION` con
//   `details = [{from_status},{from_is_hidden},{to_status},{to_is_hidden},{action},{allowed}]`.
//   Whitelist explícita:
//     - `pending`  → { approve, reject }
//     - `approved` → { hide (si is_hidden=false), unhide (si is_hidden=true) }
//     - `rejected` → {}   ← EC-03: re-aprobar rejected está OUT OF MVP.
//   Otros pares (EC-01 `approved→approve` doble, EC-02 `pending|rejected → hide`, etc.)
//   disparan este error sin crear AdminAction (BR-ADMIN-011 se preserva: sólo hay AdminAction
//   cuando hubo mutación efectiva).
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * 404 uniforme cuando el vendor no existe (`:id` UUID válido pero sin match) o está
 * soft-deleted. Devuelve `VENDOR_NOT_FOUND` con envelope idéntico al de US-046 (Decisión
 * PO D7 + SEC-03: response uniforme sin information leakage).
 */
export class VendorNotFoundForModerationError extends AppError {
  readonly code = ErrorCodes.VENDOR_NOT_FOUND;
  constructor(message = 'Vendor not found') {
    super(message);
  }
}

/**
 * 409 cuando la transición pedida NO está en el whitelist (Decisión PO D5). El estado
 * previo se expone en `details` para que el frontend informe al admin sin ambigüedad —
 * no es leakage: el admin ya vio el estado actual en el panel (US-074).
 */
export class InvalidVendorTransitionError extends AppError {
  readonly code = ErrorCodes.INVALID_TRANSITION;
  constructor(
    public readonly fromStatus: string,
    public readonly fromIsHidden: boolean,
    public readonly toStatus: string,
    public readonly toIsHidden: boolean,
    public readonly action: string,
    public readonly allowed: string[],
    message = 'Invalid vendor moderation transition',
  ) {
    super(message);
  }
}
