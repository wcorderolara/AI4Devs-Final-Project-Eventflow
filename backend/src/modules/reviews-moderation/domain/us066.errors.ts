// Errores de dominio — Listado de reviews por vendor (US-066).
//
// * `VendorNotFoundForReviewsError` — vendor inexistente, o (para no-admin) vendor con
//   `status !== 'approved'`. Se responde `404 VENDOR_NOT_FOUND` uniforme (SEC-04 / D5) — no
//   distingue "no existe" vs "no aprobado" hacia clientes no-admin.
// * `Us066InvalidCursorError` — cursor no decodifica o payload inválido → `400 INVALID_CURSOR`
//   (EC-03). Se crea local al módulo para evitar cross-module coupling con vendor-management.
// * `InvalidPageSizeError` — captura semántica del techo del DTO cuando el consumidor prefiere
//   emitir `INVALID_PAGE_SIZE` en lugar del `VALIDATION_ERROR` genérico (EC-04 / VR-02). En la
//   práctica el Zod refine ya devuelve `VALIDATION_ERROR`; esta clase se conserva por si el
//   controller quiere elevarla explícitamente (mantenida para paridad con el catálogo VR).
import { AppError, type HttpErrorMapping } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

export class VendorNotFoundForReviewsError extends AppError {
  readonly code = ErrorCodes.VENDOR_NOT_FOUND;
  override readonly httpStatus = 404;
  constructor(message = 'Vendor not found') {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Vendor not found' };
  }
}

export class Us066InvalidCursorError extends AppError {
  readonly code = ErrorCodes.INVALID_CURSOR;
  override readonly httpStatus = 400;
  constructor(message = 'Invalid cursor') {
    super(message);
  }
}

export class InvalidPageSizeError extends Error {
  constructor(message = 'Invalid pageSize') {
    super(message);
    this.name = 'InvalidPageSizeError';
  }
}
