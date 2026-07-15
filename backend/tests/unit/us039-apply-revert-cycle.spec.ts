// US-039 (PB-P1-023 / QA-002 IT-04..08 en modo DB-free + QA-004 PERF-01) — Cierra el ciclo
// apply → revert usando fakes que emulan la persistencia por row-id. Complementa QA-001 (UT)
// cubriendo:
//   IT-04 idempotencia: doble applyOnConfirm no duplica el increment.
//   IT-05 idempotencia: doble revertOnCancel no duplica el decrement.
//   IT-07 auto-create D2 preservado al hacer revert (no borra el item auto-creado).
//   IT-08 confirm + cancel + nuevo confirm sobre distinto intent (misma categoría) equilibra.
//   PERF-01 latencia del path apply happy < 50 ms (baseline in-memory).
import { describe, it, expect } from 'vitest';
import { UpdateCommittedFromBookingIntentUseCase } from '../../src/modules/budget-management/application/update-committed-from-booking-intent.use-case.js';
import type {
  BookingIntentRepository,
  BookingIntentSyncSnapshot,
} from '../../src/modules/booking-intent/ports/booking-intent.repository.js';
import type {
  BudgetItemRow,
  BudgetItemWriteRepository,
  CreateBudgetItemInput,
} from '../../src/modules/budget-management/ports/budget-item-write.repository.js';
import type { BudgetSyncEventLogger } from '../../src/shared/logging/budget-sync-events.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const BUDGET_ID = 'budget-1';
const EVENT_ID = 'event-1';
const CATEGORY_CODE = 'catering';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tx = {} as any;

function silentLogger(): BudgetSyncEventLogger {
  const noop = (): void => undefined;
  return {
    emitSynced: noop,
    emitSkippedAlreadySynced: noop,
    emitSkippedNothingToRevert: noop,
    emitSkippedZeroAmount: noop,
    emitAutoCreatedByBooking: noop,
    emitCurrencyMismatch: noop,
  };
}

interface Store {
  intents: Map<string, BookingIntentSyncSnapshot>;
  items: Map<string, BudgetItemRow>;
  totalsRecomputes: number;
}

function makeStore(): Store {
  return { intents: new Map(), items: new Map(), totalsRecomputes: 0 };
}

function bookingRepoOn(store: Store): BookingIntentRepository {
  return {
    create: async () => {
      throw new Error('not used');
    },
    findById: async () => null,
    confirm: async () => {
      throw new Error('not used');
    },
    cancel: async () => {
      throw new Error('not used');
    },
    findByIdForSync: async (_tx, id) => {
      const s = store.intents.get(id);
      return s ? { ...s } : null;
    },
    markCommittedSynced: async (_tx, args) => {
      const s = store.intents.get(args.id);
      if (!s) throw new Error('intent not found');
      store.intents.set(args.id, { ...s, committedSyncedAt: args.at, committedSyncedAmount: args.amount });
    },
    clearCommittedSync: async (_tx, args) => {
      const s = store.intents.get(args.id);
      if (!s) throw new Error('intent not found');
      store.intents.set(args.id, { ...s, committedSyncedAt: null, committedSyncedAmount: null });
    },
  };
}

function itemRepoOn(store: Store): BudgetItemWriteRepository {
  let seq = 1;
  return {
    create: async (_tx, input: CreateBudgetItemInput) => {
      const id = `auto-${seq++}`;
      const row: BudgetItemRow = {
        id,
        budgetId: input.budgetId,
        label: input.label,
        categoryCode: input.categoryCode,
        amountPlanned: input.amountPlanned,
        amountCommitted: input.amountCommitted,
      };
      store.items.set(id, row);
      return { ...row };
    },
    update: async () => {
      throw new Error('not used');
    },
    hardDelete: async () => undefined,
    recomputeBudgetTotals: async () => {
      store.totalsRecomputes += 1;
    },
    findReplaceableAiItems: async () => [],
    hardDeleteMany: async () => undefined,
    createManyForRecommendation: async () => [],
    findByBudgetAndCategoryCode: async (_tx, args) => {
      for (const row of store.items.values()) {
        if (row.budgetId === args.budgetId && row.categoryCode === args.categoryCode) return { ...row };
      }
      return null;
    },
    incrementCommittedBy: async (_tx, args) => {
      const row = store.items.get(args.itemId);
      if (!row) throw new Error('item not found');
      const updated = { ...row, amountCommitted: row.amountCommitted + args.delta };
      store.items.set(args.itemId, updated);
      return { ...updated };
    },
    decrementCommittedBy: async (_tx, args) => {
      const row = store.items.get(args.itemId);
      if (!row) throw new Error('item not found');
      const updated = { ...row, amountCommitted: row.amountCommitted - args.delta };
      store.items.set(args.itemId, updated);
      return { ...updated };
    },
    lockBudgetForSync: async () => undefined,
    ensureBudgetForEvent: async () => ({ id: BUDGET_ID }),
  };
}

function clockAt(t: Date): ClockPort {
  return { now: () => t };
}

function seedIntent(store: Store, id: string, amount: number): void {
  store.intents.set(id, {
    id,
    eventId: EVENT_ID,
    serviceCategoryId: 'sc-catering',
    status: 'confirmed_intent',
    quote: { amount, currency: 'GTQ' },
    event: { currency: 'GTQ', budgetId: BUDGET_ID },
    serviceCategoryCode: CATEGORY_CODE,
    committedSyncedAt: null,
    committedSyncedAmount: null,
  });
}

describe('US-039 QA-002 (IT DB-free) + QA-004 (PERF-01) — apply/revert cycle', () => {
  it('IT-04: doble applyOnConfirm no duplica el increment', async () => {
    const store = makeStore();
    seedIntent(store, 'bi-1', 500);
    store.items.set('item-1', {
      id: 'item-1',
      budgetId: BUDGET_ID,
      label: 'Catering',
      categoryCode: CATEGORY_CODE,
      amountPlanned: 1000,
      amountCommitted: 0,
    });
    const uc = new UpdateCommittedFromBookingIntentUseCase(
      bookingRepoOn(store),
      itemRepoOn(store),
      clockAt(NOW),
      silentLogger(),
    );

    await uc.applyOnConfirm({ bookingIntentId: 'bi-1', tx });
    await uc.applyOnConfirm({ bookingIntentId: 'bi-1', tx });

    expect(store.items.get('item-1')!.amountCommitted).toBe(500);
    expect(store.intents.get('bi-1')!.committedSyncedAt).toEqual(NOW);
  });

  it('IT-05: doble revertOnCancel no duplica el decrement', async () => {
    const store = makeStore();
    store.items.set('item-1', {
      id: 'item-1',
      budgetId: BUDGET_ID,
      label: 'Catering',
      categoryCode: CATEGORY_CODE,
      amountPlanned: 1000,
      amountCommitted: 500,
    });
    store.intents.set('bi-1', {
      id: 'bi-1',
      eventId: EVENT_ID,
      serviceCategoryId: 'sc-catering',
      status: 'cancelled',
      quote: { amount: 500, currency: 'GTQ' },
      event: { currency: 'GTQ', budgetId: BUDGET_ID },
      serviceCategoryCode: CATEGORY_CODE,
      committedSyncedAt: new Date('2026-07-14T00:00:00Z'),
      committedSyncedAmount: 500,
    });
    const uc = new UpdateCommittedFromBookingIntentUseCase(
      bookingRepoOn(store),
      itemRepoOn(store),
      clockAt(NOW),
      silentLogger(),
    );
    const cancellation = { at: NOW, by: 'u-1', reason: 'test' };

    await uc.revertOnCancel({ bookingIntentId: 'bi-1', tx, cancellation });
    await uc.revertOnCancel({ bookingIntentId: 'bi-1', tx, cancellation });

    expect(store.items.get('item-1')!.amountCommitted).toBe(0);
    expect(store.intents.get('bi-1')!.committedSyncedAt).toBeNull();
  });

  it('IT-07: auto-create D2 preservado tras revert (item no se elimina)', async () => {
    const store = makeStore();
    seedIntent(store, 'bi-1', 500);
    const uc = new UpdateCommittedFromBookingIntentUseCase(
      bookingRepoOn(store),
      itemRepoOn(store),
      clockAt(NOW),
      silentLogger(),
    );

    await uc.applyOnConfirm({ bookingIntentId: 'bi-1', tx });
    const autoId = Array.from(store.items.keys())[0]!;
    expect(store.items.get(autoId)!.amountCommitted).toBe(500);

    // Simular cancelación: cambiamos el status del intent en el store (el upstream lo haría en la tx).
    const snap = store.intents.get('bi-1')!;
    store.intents.set('bi-1', { ...snap, status: 'cancelled' });
    await uc.revertOnCancel({
      bookingIntentId: 'bi-1',
      tx,
      cancellation: { at: NOW, by: 'u-1', reason: 'test' },
    });

    expect(store.items.has(autoId)).toBe(true);
    expect(store.items.get(autoId)!.amountCommitted).toBe(0);
  });

  it('IT-08: confirm + cancel + nuevo confirm sobre distinto intent equilibra committed', async () => {
    const store = makeStore();
    store.items.set('item-1', {
      id: 'item-1',
      budgetId: BUDGET_ID,
      label: 'Catering',
      categoryCode: CATEGORY_CODE,
      amountPlanned: 1000,
      amountCommitted: 0,
    });
    seedIntent(store, 'bi-1', 500);
    seedIntent(store, 'bi-2', 300);
    const uc = new UpdateCommittedFromBookingIntentUseCase(
      bookingRepoOn(store),
      itemRepoOn(store),
      clockAt(NOW),
      silentLogger(),
    );

    await uc.applyOnConfirm({ bookingIntentId: 'bi-1', tx });
    // Cancel bi-1 (upstream cambió status).
    store.intents.set('bi-1', { ...store.intents.get('bi-1')!, status: 'cancelled' });
    await uc.revertOnCancel({
      bookingIntentId: 'bi-1',
      tx,
      cancellation: { at: NOW, by: 'u-1', reason: 'reschedule' },
    });
    await uc.applyOnConfirm({ bookingIntentId: 'bi-2', tx });

    expect(store.items.get('item-1')!.amountCommitted).toBe(300);
  });

  it('PERF-01: applyOnConfirm happy path < 50 ms (baseline in-memory)', async () => {
    const store = makeStore();
    store.items.set('item-1', {
      id: 'item-1',
      budgetId: BUDGET_ID,
      label: 'Catering',
      categoryCode: CATEGORY_CODE,
      amountPlanned: 1000,
      amountCommitted: 0,
    });
    seedIntent(store, 'bi-1', 500);
    const uc = new UpdateCommittedFromBookingIntentUseCase(
      bookingRepoOn(store),
      itemRepoOn(store),
      clockAt(NOW),
      silentLogger(),
    );

    const start = performance.now();
    await uc.applyOnConfirm({ bookingIntentId: 'bi-1', tx });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });
});
