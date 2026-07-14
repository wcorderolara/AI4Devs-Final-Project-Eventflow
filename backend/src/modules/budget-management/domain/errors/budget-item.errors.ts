// US-036 (PB-P1-020 / BE-004..006, R1) — Errores tipados del dominio budget-management.
// Cada clase extiende `AppError` y se mapea a HTTP status + código de catálogo en
// `error-handler.middleware.ts` (patrón bulk-confirm / create / mutate task-management).
import { AppError } from '../../../../shared/domain/errors/app.error.js';

/**
 * DELETE bloqueado por `amount_committed > 0` (AC-04 R1 / D2).
 * HTTP 409 · code `ITEM_HAS_COMMITMENT`.
 */
export class ItemHasCommitmentError extends AppError {
  readonly code = 'ITEM_HAS_COMMITMENT';
  constructor(public readonly amountCommitted: number) {
    super('Cannot delete a budget item with committed amount');
  }
}

/**
 * DELETE bloqueado por `BookingIntent.pending` en `(eventId, serviceCategoryId)` (AC-05 R1 / D2).
 * HTTP 409 · code `ITEM_HAS_PENDING_INTENT`.
 */
export class ItemHasPendingIntentError extends AppError {
  readonly code = 'ITEM_HAS_PENDING_INTENT';
  constructor() {
    super('Cannot delete a budget item with a pending booking intent for its category');
  }
}

/**
 * PATCH bloqueado: cambio de `category_code` con `amount_committed > 0` (AC-02 R1 / D5).
 * HTTP 409 · code `ITEM_HAS_COMMITMENT_CATEGORY_LOCKED`.
 */
export class ItemCategoryLockedError extends AppError {
  readonly code = 'ITEM_HAS_COMMITMENT_CATEGORY_LOCKED';
  constructor(public readonly amountCommitted: number) {
    super('Cannot change category on a budget item with committed amount');
  }
}

/**
 * Mutación bloqueada por estado del evento (`cancelled` o `completed`) (AC-06 R1 / D3).
 * HTTP 409 · code `EVENT_NOT_EDITABLE`.
 */
export class EventNotEditableError extends AppError {
  readonly code = 'EVENT_NOT_EDITABLE';
  constructor(public readonly eventStatus: string) {
    super(`Event is not editable in status '${eventStatus}'`);
  }
}

/**
 * `category_code` provisto no existe en la whitelist activa
 * (`ServiceCategory.code WHERE is_active = true AND deleted_at IS NULL`).
 * HTTP 400 · code `INVALID_CATEGORY_CODE`.
 */
export class InvalidCategoryCodeError extends AppError {
  readonly code = 'INVALID_CATEGORY_CODE';
  constructor(public readonly categoryCode: string) {
    super(`category_code '${categoryCode}' not found or inactive`);
  }
}
