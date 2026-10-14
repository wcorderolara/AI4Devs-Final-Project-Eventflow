// US-025 (PB-P1-016 / BE-002) — Errores tipados del flujo HITL Accept/Edit/Discard. Doc 16 §35.3.
// Cada clase declara su mapeo HTTP según los códigos de la Tech Spec §12.
import { AppError, type HttpErrorMapping } from '../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../shared/domain/errors/error-codes.js';

/** 409 — La AIRecommendation no está en `status='pending'` (EC-01, EC-07). */
export class RecommendationNotPendingError extends AppError {
  readonly code = ErrorCodes.RECOMMENDATION_NOT_PENDING;
  override readonly httpStatus = 409;
  constructor(message = 'Recommendation is not pending') {
    super(message);
  }
}

/** 422 — No hay `ApplyStrategy` registrada para el `type` (EC-05). */
export class RecommendationTypeNotApplicableError extends AppError {
  readonly code = ErrorCodes.RECOMMENDATION_TYPE_NOT_APPLICABLE;
  override readonly httpStatus = 422;
  constructor(readonly type: string, message = `No apply strategy registered for type: ${type}`) {
    super(message);
  }
}

/** 400 — `editedPayload` no cumple el `*OutputDto` (EC-03). */
export class EditedPayloadInvalidError extends AppError {
  readonly code = ErrorCodes.EDITED_PAYLOAD_INVALID;
  override readonly httpStatus = 400;
  constructor(
    readonly zodIssuesSummary: string,
    message = `Edited payload failed schema validation: ${zodIssuesSummary}`,
  ) {
    super(message);
  }
}

/** 500 — La strategy `applyInTransaction` falló; rollback automático (EC-04). */
export class SideEffectFailedError extends AppError {
  readonly code = ErrorCodes.SIDE_EFFECT_FAILED;
  override readonly httpStatus = 500;
  constructor(
    readonly type: string,
    override readonly cause?: unknown,
    message = `Side effect failed for type ${type}`,
  ) {
    super(message);
  }

  override toHttp(): HttpErrorMapping {
    return { ...super.toHttp(), message: 'Side effect failed' };
  }
}

/**
 * Ownership denegado. `toHttp()` mapea:
 *   - `admin_excluded` → 403 FORBIDDEN (FR-ADMIN-010; admin no participa del HITL).
 *   - `not_owner`      → 404 RESOURCE_NOT_FOUND (SEC-08, no-revelación).
 */
export type OwnershipDenyReason = 'admin_excluded' | 'not_owner';
export class OwnershipDeniedError extends AppError {
  readonly code: string;
  override readonly httpStatus: number;
  constructor(readonly reason: OwnershipDenyReason, message = `Ownership denied: ${reason}`) {
    super(message);
    this.code = reason === 'admin_excluded' ? ErrorCodes.FORBIDDEN : ErrorCodes.RESOURCE_NOT_FOUND;
    this.httpStatus = reason === 'admin_excluded' ? 403 : 404;
  }

  override toHttp(): HttpErrorMapping {
    if (this.reason === 'admin_excluded') {
      return { ...super.toHttp(), message: 'Admins cannot perform HITL actions' };
    }
    return { ...super.toHttp(), message: 'Resource not found', masked: true };
  }
}
