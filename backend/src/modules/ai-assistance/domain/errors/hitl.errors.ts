// US-025 (PB-P1-016 / BE-002) — Errores tipados del flujo HITL Accept/Edit/Discard. Doc 16 §35.3.
// El error-handler central mapea a los códigos HTTP declarados por la Tech Spec §12.
import { AppError } from '../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../shared/domain/errors/error-codes.js';

/** 409 — La AIRecommendation no está en `status='pending'` (EC-01, EC-07). */
export class RecommendationNotPendingError extends AppError {
  readonly code = ErrorCodes.RECOMMENDATION_NOT_PENDING;
  constructor(message = 'Recommendation is not pending') {
    super(message);
  }
}

/** 422 — No hay `ApplyStrategy` registrada para el `type` (EC-05). */
export class RecommendationTypeNotApplicableError extends AppError {
  readonly code = ErrorCodes.RECOMMENDATION_TYPE_NOT_APPLICABLE;
  constructor(readonly type: string, message = `No apply strategy registered for type: ${type}`) {
    super(message);
  }
}

/** 400 — `editedPayload` no cumple el `*OutputDto` (EC-03). */
export class EditedPayloadInvalidError extends AppError {
  readonly code = ErrorCodes.EDITED_PAYLOAD_INVALID;
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
  constructor(
    readonly type: string,
    override readonly cause?: unknown,
    message = `Side effect failed for type ${type}`,
  ) {
    super(message);
  }
}

/**
 * Ownership denegado. El error-handler central mapea:
 *   - `admin_excluded` → 403 FORBIDDEN (FR-ADMIN-010; admin no participa del HITL).
 *   - `not_owner`      → 404 RESOURCE_NOT_FOUND (SEC-08, no-revelación).
 */
export type OwnershipDenyReason = 'admin_excluded' | 'not_owner';
export class OwnershipDeniedError extends AppError {
  readonly code: string;
  constructor(readonly reason: OwnershipDenyReason, message = `Ownership denied: ${reason}`) {
    super(message);
    this.code = reason === 'admin_excluded' ? ErrorCodes.FORBIDDEN : ErrorCodes.RESOURCE_NOT_FOUND;
  }
}
