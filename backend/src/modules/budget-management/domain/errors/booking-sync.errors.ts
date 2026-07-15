// US-039 (PB-P1-023 / BE-003) — Errores tipados del handler `UpdateCommittedFromBookingIntent`.
// El handler es system-driven y NO expone endpoint; estos errores propagan a la transacción del
// invocador upstream (ConfirmBookingIntentUseCase / CancelBookingIntentUseCase) que decide su
// mapeo HTTP. Se mantiene el patrón `AppError` para consistencia con `error-handler.middleware`.
import { AppError } from '../../../../shared/domain/errors/app.error.js';

/**
 * Currency mismatch defensa profunda (AC-05 / VR-04):
 * `bookingIntent.quote.currency` distinto de `event.currency`. Debería ser inalcanzable en
 * condiciones normales — indica corrupción de datos (Quote y Event divergieron).
 * HTTP 409 (heredado del código existente `CURRENCY_MISMATCH`).
 */
export class BookingSyncCurrencyMismatchError extends AppError {
  readonly code = 'CURRENCY_MISMATCH';
  constructor(
    public readonly intentCurrency: string,
    public readonly eventCurrency: string,
    public readonly bookingIntentId: string,
  ) {
    super(
      `Booking sync currency mismatch: intent=${intentCurrency} event=${eventCurrency} (bookingIntentId=${bookingIntentId})`,
    );
  }
}

/**
 * Estado inconsistente en `revertOnCancel`: el intent tiene `committed_synced_at` pero el
 * BudgetItem esperado no existe. Nunca debería ocurrir bajo la política D2 (no borrar items
 * con `committed > 0` — US-036 D2). HTTP 500.
 */
export class BookingSyncMissingBudgetItemError extends AppError {
  readonly code = 'BOOKING_SYNC_MISSING_BUDGET_ITEM';
  constructor(public readonly bookingIntentId: string, public readonly categoryCode: string) {
    super(
      `Cannot revert committed sync: BudgetItem not found for bookingIntentId=${bookingIntentId} categoryCode=${categoryCode}`,
    );
  }
}

/**
 * Estado inválido para sync (VR-05): `applyOnConfirm` sobre un intent no confirmado, o
 * `revertOnCancel` sobre un intent no cancelado. Indica un bug del invocador upstream.
 * HTTP 422.
 */
export class BookingSyncInvalidStateError extends AppError {
  readonly code = 'BOOKING_SYNC_INVALID_STATE';
  constructor(
    public readonly bookingIntentId: string,
    public readonly currentStatus: string,
    public readonly expectedStatus: string,
  ) {
    super(
      `Booking sync invalid state: bookingIntentId=${bookingIntentId} status=${currentStatus} expected=${expectedStatus}`,
    );
  }
}
