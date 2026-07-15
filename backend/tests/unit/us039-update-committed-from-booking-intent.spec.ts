// US-039 (PB-P1-023 / QA-001) — Unit tests UT-01..07 del use case
// `UpdateCommittedFromBookingIntentUseCase`. DB-free: fakes de repos y logger.
//
// UT-01 applyOnConfirm con BudgetItem existente: increment + set `committed_synced_at`.
// UT-02 applyOnConfirm sin BudgetItem: auto-create (D2) + increment + log warning.
// UT-03 applyOnConfirm con `committed_synced_at !== null`: skip + log info.
// UT-04 applyOnConfirm con `quote.amount === 0`: skip + log info.
// UT-05 applyOnConfirm con currency mismatch: throw `BookingSyncCurrencyMismatchError`.
// UT-06 revertOnCancel con `committed_synced_at !== null`: decrement + reset.
// UT-07 revertOnCancel con `committed_synced_at === null`: skip + log info.
import { describe, it, expect, vi } from 'vitest';
import { UpdateCommittedFromBookingIntentUseCase } from '../../src/modules/budget-management/application/update-committed-from-booking-intent.use-case.js';
import type {
  BookingIntentRepository,
  BookingIntentSyncSnapshot,
} from '../../src/modules/booking-intent/ports/booking-intent.repository.js';
import type {
  BudgetItemRow,
  BudgetItemWriteRepository,
} from '../../src/modules/budget-management/ports/budget-item-write.repository.js';
import type { BudgetSyncEventLogger } from '../../src/shared/logging/budget-sync-events.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import { BookingSyncCurrencyMismatchError } from '../../src/modules/budget-management/domain/errors/booking-sync.errors.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const BOOKING_ID = '00000000-0000-0000-0000-000000000b01';
const EVENT_ID = '00000000-0000-0000-0000-0000000000e1';
const BUDGET_ID = '00000000-0000-0000-0000-0000000000d1';
const CATEGORY_CODE = 'catering';

function fakeClock(): ClockPort {
  return { now: () => NOW };
}

function fakeItem(overrides: Partial<BudgetItemRow> = {}): BudgetItemRow {
  return {
    id: 'item-1',
    budgetId: BUDGET_ID,
    label: 'Catering',
    categoryCode: CATEGORY_CODE,
    amountPlanned: 1000,
    amountCommitted: 200,
    ...overrides,
  };
}

function snapshot(overrides: Partial<BookingIntentSyncSnapshot> = {}): BookingIntentSyncSnapshot {
  return {
    id: BOOKING_ID,
    eventId: EVENT_ID,
    serviceCategoryId: 'sc-1',
    status: 'confirmed_intent',
    quote: { amount: 500, currency: 'GTQ' },
    event: { currency: 'GTQ', budgetId: BUDGET_ID },
    serviceCategoryCode: CATEGORY_CODE,
    committedSyncedAt: null,
    committedSyncedAmount: null,
    ...overrides,
  };
}

function fakeBookingRepo(snap: BookingIntentSyncSnapshot | null): BookingIntentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    confirm: vi.fn(),
    cancel: vi.fn(),
    findByIdForSync: vi.fn(async () => snap),
    markCommittedSynced: vi.fn(async () => undefined),
    clearCommittedSync: vi.fn(async () => undefined),
  };
}

function fakeItemRepo(
  overrides: Partial<BudgetItemWriteRepository> = {},
): BudgetItemWriteRepository {
  return {
    create: vi.fn(async (_tx, input) => fakeItem({ id: 'auto-1', ...input })),
    update: vi.fn(async () => fakeItem()),
    hardDelete: vi.fn(async () => undefined),
    recomputeBudgetTotals: vi.fn(async () => undefined),
    findReplaceableAiItems: vi.fn(async () => []),
    hardDeleteMany: vi.fn(async () => undefined),
    createManyForRecommendation: vi.fn(async () => []),
    findByBudgetAndCategoryCode: vi.fn(async () => fakeItem()),
    incrementCommittedBy: vi.fn(async (_tx, args) =>
      fakeItem({ id: args.itemId, amountCommitted: 200 + args.delta }),
    ),
    decrementCommittedBy: vi.fn(async (_tx, args) =>
      fakeItem({ id: args.itemId, amountCommitted: 200 - args.delta }),
    ),
    lockBudgetForSync: vi.fn(async () => undefined),
    ensureBudgetForEvent: vi.fn(async () => ({ id: BUDGET_ID })),
    ...overrides,
  };
}

function fakeLogger(): BudgetSyncEventLogger & Record<string, ReturnType<typeof vi.fn>> {
  return {
    emitSynced: vi.fn(),
    emitSkippedAlreadySynced: vi.fn(),
    emitSkippedNothingToRevert: vi.fn(),
    emitSkippedZeroAmount: vi.fn(),
    emitAutoCreatedByBooking: vi.fn(),
    emitCurrencyMismatch: vi.fn(),
  } as unknown as BudgetSyncEventLogger & Record<string, ReturnType<typeof vi.fn>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tx = {} as any;

describe('US-039 QA-001 — UpdateCommittedFromBookingIntentUseCase', () => {
  it('UT-01: applyOnConfirm con BudgetItem existente incrementa y marca sincronizado', async () => {
    const snap = snapshot();
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.applyOnConfirm({ bookingIntentId: BOOKING_ID, tx, correlationId: 'c-1' });

    expect(itemRepo.lockBudgetForSync).toHaveBeenCalledWith(tx, { budgetId: BUDGET_ID });
    expect(itemRepo.incrementCommittedBy).toHaveBeenCalledWith(tx, { itemId: 'item-1', delta: 500 });
    expect(bookingRepo.markCommittedSynced).toHaveBeenCalledWith(tx, {
      id: BOOKING_ID,
      at: NOW,
      amount: 500,
    });
    expect(itemRepo.recomputeBudgetTotals).toHaveBeenCalledWith(tx, BUDGET_ID);
    expect(itemRepo.create).not.toHaveBeenCalled();
    expect(logger.emitSynced).toHaveBeenCalledTimes(1);
    expect(logger.emitAutoCreatedByBooking).not.toHaveBeenCalled();
  });

  it('UT-02: applyOnConfirm sin BudgetItem auto-crea (D2) y loguea warning', async () => {
    const snap = snapshot();
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo({
      findByBudgetAndCategoryCode: vi.fn(async () => null),
    });
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.applyOnConfirm({ bookingIntentId: BOOKING_ID, tx });

    expect(itemRepo.create).toHaveBeenCalledTimes(1);
    const createArgs = (itemRepo.create as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    expect(createArgs).toMatchObject({
      budgetId: BUDGET_ID,
      categoryCode: CATEGORY_CODE,
      amountPlanned: 0,
      amountCommitted: 0,
    });
    expect(logger.emitAutoCreatedByBooking).toHaveBeenCalledTimes(1);
    expect(itemRepo.incrementCommittedBy).toHaveBeenCalledWith(tx, { itemId: 'auto-1', delta: 500 });
    expect(logger.emitSynced).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'apply', amount: 500 }),
    );
  });

  it('UT-03: applyOnConfirm sobre intent ya sincronizado hace skip idempotente', async () => {
    const snap = snapshot({ committedSyncedAt: new Date('2026-07-14T00:00:00Z'), committedSyncedAmount: 500 });
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.applyOnConfirm({ bookingIntentId: BOOKING_ID, tx });

    expect(logger.emitSkippedAlreadySynced).toHaveBeenCalledTimes(1);
    expect(itemRepo.incrementCommittedBy).not.toHaveBeenCalled();
    expect(bookingRepo.markCommittedSynced).not.toHaveBeenCalled();
  });

  it('UT-04: applyOnConfirm con quote.amount === 0 hace skip + log info (D3)', async () => {
    const snap = snapshot({ quote: { amount: 0, currency: 'GTQ' } });
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.applyOnConfirm({ bookingIntentId: BOOKING_ID, tx });

    expect(logger.emitSkippedZeroAmount).toHaveBeenCalledTimes(1);
    expect(itemRepo.incrementCommittedBy).not.toHaveBeenCalled();
    expect(bookingRepo.markCommittedSynced).not.toHaveBeenCalled();
  });

  it('UT-05: applyOnConfirm con currency mismatch lanza error tipado + log error', async () => {
    const snap = snapshot({
      quote: { amount: 500, currency: 'USD' },
      event: { currency: 'GTQ', budgetId: BUDGET_ID },
    });
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await expect(
      uc.applyOnConfirm({ bookingIntentId: BOOKING_ID, tx }),
    ).rejects.toBeInstanceOf(BookingSyncCurrencyMismatchError);
    expect(logger.emitCurrencyMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ intentCurrency: 'USD', eventCurrency: 'GTQ' }),
    );
    expect(itemRepo.incrementCommittedBy).not.toHaveBeenCalled();
  });

  it('UT-06: revertOnCancel con committed_synced_at set decrementa y limpia', async () => {
    const snap = snapshot({
      status: 'cancelled',
      committedSyncedAt: new Date('2026-07-14T00:00:00Z'),
      committedSyncedAmount: 500,
    });
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.revertOnCancel({
      bookingIntentId: BOOKING_ID,
      tx,
      cancellation: { at: NOW, by: 'user-1', reason: 'demo' },
    });

    expect(itemRepo.decrementCommittedBy).toHaveBeenCalledWith(tx, { itemId: 'item-1', delta: 500 });
    expect(bookingRepo.clearCommittedSync).toHaveBeenCalledWith(tx, { id: BOOKING_ID });
    expect(itemRepo.recomputeBudgetTotals).toHaveBeenCalledWith(tx, BUDGET_ID);
    expect(logger.emitSynced).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'revert', amount: 500 }),
    );
  });

  it('UT-07: revertOnCancel con committed_synced_at === null hace skip (nothing to revert)', async () => {
    const snap = snapshot({ status: 'cancelled', committedSyncedAt: null, committedSyncedAmount: null });
    const bookingRepo = fakeBookingRepo(snap);
    const itemRepo = fakeItemRepo();
    const logger = fakeLogger();
    const uc = new UpdateCommittedFromBookingIntentUseCase(bookingRepo, itemRepo, fakeClock(), logger);

    await uc.revertOnCancel({
      bookingIntentId: BOOKING_ID,
      tx,
      cancellation: { at: NOW, by: 'user-1', reason: 'demo' },
    });

    expect(logger.emitSkippedNothingToRevert).toHaveBeenCalledTimes(1);
    expect(itemRepo.decrementCommittedBy).not.toHaveBeenCalled();
    expect(bookingRepo.clearCommittedSync).not.toHaveBeenCalled();
  });
});
