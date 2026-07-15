// US-039 (PB-P1-023 / BE-006) — Logger estructurado del handler `UpdateCommittedFromBookingIntent`.
// Sin PII: solo IDs, montos, códigos de categoría/moneda, `action`, `correlationId` y `durationMs`.
// Patrón consistente con `budget-ai-events.ts` (US-037): un helper por evento, `logger.info/warn/error`
// emitiendo JSON con `event` como discriminante.
import { logger } from '../infrastructure/logger/index.js';

/** Base compartida por todos los eventos del catálogo M07 §sync. */
interface BudgetSyncBaseEvent {
  bookingIntentId: string;
  correlationId?: string;
}

export interface BudgetCommittedSyncedEvent extends BudgetSyncBaseEvent {
  action: 'apply' | 'revert';
  budgetItemId: string;
  eventId: string;
  serviceCategoryCode: string;
  amount: number;
  durationMs?: number;
}

export interface BudgetItemAutoCreatedByBookingEvent extends BudgetSyncBaseEvent {
  newBudgetItemId: string;
  eventId: string;
  serviceCategoryCode: string;
}

export interface BudgetCommittedCurrencyMismatchEvent extends BudgetSyncBaseEvent {
  eventId: string;
  intentCurrency: string;
  eventCurrency: string;
}

export function emitBudgetCommittedSynced(evt: BudgetCommittedSyncedEvent): void {
  logger.info(JSON.stringify({ event: 'budget.committed.synced', ...evt }));
}

export function emitBudgetCommittedSkippedAlreadySynced(evt: BudgetSyncBaseEvent): void {
  logger.info(JSON.stringify({ event: 'budget.committed.skipped_already_synced', ...evt }));
}

export function emitBudgetCommittedSkippedNothingToRevert(evt: BudgetSyncBaseEvent): void {
  logger.info(JSON.stringify({ event: 'budget.committed.skipped_nothing_to_revert', ...evt }));
}

export function emitBudgetCommittedSkippedZeroAmount(evt: BudgetSyncBaseEvent): void {
  logger.info(JSON.stringify({ event: 'budget.committed.skipped_zero_amount', ...evt }));
}

export function emitBudgetItemAutoCreatedByBooking(evt: BudgetItemAutoCreatedByBookingEvent): void {
  logger.warn(JSON.stringify({ event: 'budget.item.auto_created_by_booking', ...evt }));
}

export function emitBudgetCommittedCurrencyMismatch(evt: BudgetCommittedCurrencyMismatchEvent): void {
  logger.error(JSON.stringify({ event: 'budget.committed.currency_mismatch', ...evt }));
}

/** Port opcional para inyectar en use cases (tests). Default: helpers concretos de arriba. */
export interface BudgetSyncEventLogger {
  emitSynced(evt: BudgetCommittedSyncedEvent): void;
  emitSkippedAlreadySynced(evt: BudgetSyncBaseEvent): void;
  emitSkippedNothingToRevert(evt: BudgetSyncBaseEvent): void;
  emitSkippedZeroAmount(evt: BudgetSyncBaseEvent): void;
  emitAutoCreatedByBooking(evt: BudgetItemAutoCreatedByBookingEvent): void;
  emitCurrencyMismatch(evt: BudgetCommittedCurrencyMismatchEvent): void;
}

export const DefaultBudgetSyncEventLogger: BudgetSyncEventLogger = {
  emitSynced: emitBudgetCommittedSynced,
  emitSkippedAlreadySynced: emitBudgetCommittedSkippedAlreadySynced,
  emitSkippedNothingToRevert: emitBudgetCommittedSkippedNothingToRevert,
  emitSkippedZeroAmount: emitBudgetCommittedSkippedZeroAmount,
  emitAutoCreatedByBooking: emitBudgetItemAutoCreatedByBooking,
  emitCurrencyMismatch: emitBudgetCommittedCurrencyMismatch,
};
