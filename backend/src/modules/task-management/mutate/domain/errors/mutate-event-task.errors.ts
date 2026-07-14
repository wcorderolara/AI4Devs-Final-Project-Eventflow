// US-029 (PB-P1-018 / BE-007) — Errores de dominio del módulo `mutate`.
// El error handler central los mapea a HTTP + código de catálogo:
//   * `EmptyPatchError`         → 400 EMPTY_PATCH.
//   * `InvalidTransitionError`  → 409 INVALID_TRANSITION (con details.current/requested/allowed).
// `CategoryNotAvailableError`, `DueDateInPastError`, `UnsupportedMediaTypeError` se REUSAN
// del módulo `create/` (US-028). `EventNotMutableError` se reusa del módulo `bulk-confirm/`.
// `NotFoundError` del shared kernel cubre no-revelación 404.
import { AppError } from '../../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../../shared/domain/errors/error-codes.js';
import type { CanonicalEventTaskStatus } from '../EventTaskStateMachineService.js';

/** 400 EMPTY_PATCH — cuerpo PATCH content sin ningún campo editable definido (EC-06, VR-05). */
export class EmptyPatchError extends AppError {
  readonly code = ErrorCodes.EMPTY_PATCH;
  constructor() {
    super('At least one editable field must be provided.');
  }
}

/**
 * 409 INVALID_TRANSITION — transición no permitida por el state machine (EC-02, VR-11).
 * `details` incluye current/requested/allowed para que la UI pueda ajustar el menú.
 */
export class InvalidTransitionDomainError extends AppError {
  readonly code = ErrorCodes.INVALID_TRANSITION;
  readonly current: CanonicalEventTaskStatus;
  readonly requested: CanonicalEventTaskStatus;
  readonly allowed: CanonicalEventTaskStatus[];
  constructor(current: CanonicalEventTaskStatus, requested: CanonicalEventTaskStatus, allowed: CanonicalEventTaskStatus[]) {
    super(`Transition not allowed from '${current}' to '${requested}'.`);
    this.current = current;
    this.requested = requested;
    this.allowed = allowed;
  }
}
