// US-039 (PB-P1-023 / BE-003) — Handler system-driven que sincroniza `BudgetItem.committed`
// al confirmarse o cancelarse un BookingIntent. Se ejecuta DENTRO de la `prisma.$transaction`
// abierta por el invocador upstream (ConfirmBookingIntent / CancelBookingIntent — US-096).
//
// Reglas cerradas (no reabrir sin ADR):
//   D1: idempotencia vía `committed_synced_at`/`committed_synced_amount` en `BookingIntent`.
//   D2: auto-create de `BudgetItem` si no existe activo para (budgetId, categoryCode). No reusa
//       items soft-deleted (no aplica: `BudgetItem` no tiene soft delete, ADR-DB-004).
//   D3: `Quote.amount === 0` → skip silencioso + log info.
//   D4: NO verificar `event.status` (responsabilidad del invocador upstream).
//
// Concurrencia: `bookingIntentRepo.findByIdForSync` adquiere `SELECT FOR UPDATE` sobre la fila
// de `booking_intents`; `budgetItemRepo.lockBudgetForSync` serializa el find-or-create sobre
// `budgets`; `incrementCommittedBy`/`decrementCommittedBy` usan `column ± delta` atómicos.
import type { Prisma } from '@prisma/client';
import type { ClockPort } from '../../../shared/domain/clock.port.js';
import type {
  BookingIntentRepository,
  BookingIntentSyncSnapshot,
} from '../../booking-intent/ports/booking-intent.repository.js';
import type { BudgetSyncCancellationInput } from '../../booking-intent/ports/budget-committed-sync.port.js';
import type {
  BudgetItemRow,
  BudgetItemWriteRepository,
} from '../ports/budget-item-write.repository.js';
import type { BudgetSyncEventLogger } from '../../../shared/logging/budget-sync-events.js';
import { DefaultBudgetSyncEventLogger } from '../../../shared/logging/budget-sync-events.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  BookingSyncCurrencyMismatchError,
  BookingSyncInvalidStateError,
  BookingSyncMissingBudgetItemError,
} from '../domain/errors/booking-sync.errors.js';

export interface ApplyOnConfirmInput {
  bookingIntentId: string;
  tx: Prisma.TransactionClient;
  correlationId?: string;
}

export interface RevertOnCancelInput {
  bookingIntentId: string;
  tx: Prisma.TransactionClient;
  cancellation: BudgetSyncCancellationInput;
  correlationId?: string;
}

export class UpdateCommittedFromBookingIntentUseCase {
  constructor(
    private readonly bookingIntents: BookingIntentRepository,
    private readonly budgetItems: BudgetItemWriteRepository,
    private readonly clock: ClockPort,
    private readonly logger: BudgetSyncEventLogger = DefaultBudgetSyncEventLogger,
  ) {}

  async applyOnConfirm(input: ApplyOnConfirmInput): Promise<void> {
    const startedAt = this.clock.now().getTime();
    const snapshot = await this.bookingIntents.findByIdForSync(input.tx, input.bookingIntentId);
    if (!snapshot) throw new NotFoundError('Booking intent not found');

    if (snapshot.committedSyncedAt !== null) {
      this.logger.emitSkippedAlreadySynced({
        bookingIntentId: snapshot.id,
        correlationId: input.correlationId,
      });
      return;
    }
    if (snapshot.status !== 'confirmed_intent') {
      throw new BookingSyncInvalidStateError(snapshot.id, snapshot.status, 'confirmed_intent');
    }

    const amount = snapshot.quote.amount;
    if (amount === 0) {
      this.logger.emitSkippedZeroAmount({
        bookingIntentId: snapshot.id,
        correlationId: input.correlationId,
      });
      return;
    }
    this.assertCurrencyMatch(snapshot, input.correlationId);
    // El evento puede no tener Budget aún (creación lazy — el organizer aún no visitó la vista).
    // `ensureBudgetForEvent` es idempotente vía `Budget.@unique(eventId)`.
    const budgetId = snapshot.event.budgetId
      ?? (await this.budgetItems.ensureBudgetForEvent(input.tx, { eventId: snapshot.eventId })).id;

    await this.budgetItems.lockBudgetForSync(input.tx, { budgetId });

    let item = await this.budgetItems.findByBudgetAndCategoryCode(input.tx, {
      budgetId,
      categoryCode: snapshot.serviceCategoryCode,
    });
    let autoCreated = false;
    if (!item) {
      // D2: auto-create con planned=0, committed=0 (luego incrementa), aiRecommendationId=null.
      item = await this.budgetItems.create(input.tx, {
        budgetId,
        label: `Auto-created by booking (${snapshot.serviceCategoryCode})`,
        categoryCode: snapshot.serviceCategoryCode,
        amountPlanned: 0,
        amountCommitted: 0,
      });
      autoCreated = true;
      this.logger.emitAutoCreatedByBooking({
        bookingIntentId: snapshot.id,
        newBudgetItemId: item.id,
        eventId: snapshot.eventId,
        serviceCategoryCode: snapshot.serviceCategoryCode,
        correlationId: input.correlationId,
      });
    }

    const updatedItem = await this.budgetItems.incrementCommittedBy(input.tx, {
      itemId: item.id,
      delta: amount,
    });
    await this.bookingIntents.markCommittedSynced(input.tx, {
      id: snapshot.id,
      at: this.clock.now(),
      amount,
    });
    await this.budgetItems.recomputeBudgetTotals(input.tx, budgetId);

    this.logger.emitSynced({
      action: 'apply',
      bookingIntentId: snapshot.id,
      budgetItemId: updatedItem.id,
      eventId: snapshot.eventId,
      serviceCategoryCode: snapshot.serviceCategoryCode,
      amount,
      correlationId: input.correlationId,
      durationMs: this.clock.now().getTime() - startedAt,
    });
    // `autoCreated` se emite en su propio evento (arriba); el evento `synced` ya cubre el apply.
    void autoCreated;
  }

  async revertOnCancel(input: RevertOnCancelInput): Promise<void> {
    const startedAt = this.clock.now().getTime();
    const snapshot = await this.bookingIntents.findByIdForSync(input.tx, input.bookingIntentId);
    if (!snapshot) throw new NotFoundError('Booking intent not found');

    if (snapshot.committedSyncedAt === null) {
      this.logger.emitSkippedNothingToRevert({
        bookingIntentId: snapshot.id,
        correlationId: input.correlationId,
      });
      return;
    }
    if (snapshot.status !== 'cancelled') {
      throw new BookingSyncInvalidStateError(snapshot.id, snapshot.status, 'cancelled');
    }
    // Defensa profunda: el monto persistido es la única fuente de verdad para la reversa exacta.
    const amount = snapshot.committedSyncedAmount ?? 0;
    if (amount === 0) {
      // Estado degenerado: `committed_synced_at` set con amount=0 (no debería ocurrir dado que
      // apply salta amount=0 antes de marcar). Se limpia y se loguea skip como fallback seguro.
      await this.bookingIntents.clearCommittedSync(input.tx, { id: snapshot.id });
      this.logger.emitSkippedZeroAmount({
        bookingIntentId: snapshot.id,
        correlationId: input.correlationId,
      });
      return;
    }
    // Revert siempre supone que existe Budget (fue creado en el apply que dejó `committed_synced_at`).
    const budgetId = snapshot.event.budgetId
      ?? (await this.budgetItems.ensureBudgetForEvent(input.tx, { eventId: snapshot.eventId })).id;

    await this.budgetItems.lockBudgetForSync(input.tx, { budgetId });

    const item = await this.budgetItems.findByBudgetAndCategoryCode(input.tx, {
      budgetId,
      categoryCode: snapshot.serviceCategoryCode,
    });
    if (!item) {
      throw new BookingSyncMissingBudgetItemError(snapshot.id, snapshot.serviceCategoryCode);
    }

    const updatedItem: BudgetItemRow = await this.budgetItems.decrementCommittedBy(input.tx, {
      itemId: item.id,
      delta: amount,
    });
    await this.bookingIntents.clearCommittedSync(input.tx, { id: snapshot.id });
    await this.budgetItems.recomputeBudgetTotals(input.tx, budgetId);

    this.logger.emitSynced({
      action: 'revert',
      bookingIntentId: snapshot.id,
      budgetItemId: updatedItem.id,
      eventId: snapshot.eventId,
      serviceCategoryCode: snapshot.serviceCategoryCode,
      amount,
      correlationId: input.correlationId,
      durationMs: this.clock.now().getTime() - startedAt,
    });
    // La auditoría de cancelación (`at`/`by`/`reason`) la persiste el invocador upstream sobre
    // `booking_intents` — el input `cancellation` se acepta por contrato del port aunque este
    // handler no lo persista (fuente única de verdad: el use case Cancel del módulo booking).
    void input.cancellation;
  }

  private assertCurrencyMatch(snap: BookingIntentSyncSnapshot, correlationId?: string): void {
    if (snap.quote.currency !== snap.event.currency) {
      this.logger.emitCurrencyMismatch({
        bookingIntentId: snap.id,
        eventId: snap.eventId,
        intentCurrency: snap.quote.currency,
        eventCurrency: snap.event.currency,
        correlationId,
      });
      throw new BookingSyncCurrencyMismatchError(snap.quote.currency, snap.event.currency, snap.id);
    }
  }

}
