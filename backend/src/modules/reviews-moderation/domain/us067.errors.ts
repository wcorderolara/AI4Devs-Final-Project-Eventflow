// Errores de dominio del endpoint `POST /api/v1/admin/reviews/:id/moderate` (US-067 / BE-003).
// Mapean 1:1 a los códigos estables del contrato (Tech Spec §7 Error Handling; Decisión PO D2/D6).
//
// - `ReviewNotFoundForModerationError` → `404 REVIEW_NOT_FOUND` uniforme (Decisión PO D6;
//   SEC-05). Se usa un código específico distinto de `RESOURCE_NOT_FOUND` para diferenciar el
//   dominio review dentro del panel admin (BR-ADMIN-011); no leakea información porque el admin
//   está explícitamente autorizado a ver todas las reviews.
// - `InvalidReviewTransitionError` → `409 INVALID_TRANSITION` con `details.from` + `details.to`
//   + `details.allowed`. Whitelist explícita: `published → hidden|removed`, `hidden → removed`.
//   Otros pares (EC-01 `removed→*`, EC-02 `hidden→published`, etc.) disparan este error sin
//   crear AdminAction (§7 UseCase; SEC-03: no hard delete significa que `removed` es final).
import { AppError } from '../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

/**
 * 404 uniforme cuando la review no existe (`:id` UUID válido pero sin match). Devuelve
 * `REVIEW_NOT_FOUND` con envelope idéntico al del not-found genérico (Decisión PO D6 + SEC-05).
 */
export class ReviewNotFoundForModerationError extends AppError {
  readonly code = ErrorCodes.REVIEW_NOT_FOUND;
  constructor(message = 'Review not found') {
    super(message);
  }
}

/**
 * 409 cuando la transición pedida NO está en el whitelist (Decisión PO D2). El `from`/`to` se
 * exponen para que el frontend informe al admin sin ambigüedad (no es leakage: el admin ya vio
 * el estado actual en la tabla).
 */
export class InvalidReviewTransitionError extends AppError {
  readonly code = ErrorCodes.INVALID_TRANSITION;
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly allowed: string[],
    message = 'Invalid review status transition',
  ) {
    super(message);
  }
}
