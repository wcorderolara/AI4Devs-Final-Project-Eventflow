// US-036 (PB-P1-020 / QA-001, R1) — Unit tests de los 3 use cases.
// Se mockea `prisma.$transaction`, `prisma.budgetItem.findFirst` y los ports/repos.
// Cobertura:
//  UT-03 Create: setea amount_committed = 0 por defecto; whitelist activa; error si code inválido.
//  UT-05 Delete: bloqueo committed > 0 → ItemHasCommitmentError.
//  UT-07 Delete: cross-module pending → ItemHasPendingIntentError.
//  UT-08 Update: cambio de category_code con committed > 0 → ItemCategoryLockedError.
//  UT-09 Todos los use cases bloquean en event.status ∈ {cancelled, completed}.
//  UT-R1 Delete: hard delete se ejecuta dentro de transacción; snapshot pre-delete en telemetría.
//  UT-R1 Delete: category_code = null → cross-module check omitido.
//  UT-R1 Update: recompute totals solo cuando amount_planned cambia.
import { describe, it, expect, vi } from 'vitest';
import { CreateBudgetItemUseCase } from '../../src/modules/budget-management/application/create-budget-item.use-case.js';
import { UpdateBudgetItemUseCase } from '../../src/modules/budget-management/application/update-budget-item.use-case.js';
import { DeleteBudgetItemUseCase } from '../../src/modules/budget-management/application/delete-budget-item.use-case.js';
import { BudgetItemTelemetry } from '../../src/modules/budget-management/application/budget-item-telemetry.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import {
  EventNotEditableError,
  InvalidCategoryCodeError,
  ItemCategoryLockedError,
  ItemHasCommitmentError,
  ItemHasPendingIntentError,
} from '../../src/modules/budget-management/domain/errors/budget-item.errors.js';
import type { EventBudgetContextReader } from '../../src/modules/budget-management/ports/event-budget-context.reader.js';
import type { ServiceCategoryReadPort } from '../../src/modules/budget-management/ports/service-category-read.port.js';
import type { BookingIntentReadPort } from '../../src/modules/budget-management/ports/booking-intent-read.port.js';
import type {
  BudgetItemWriteRepository,
  BudgetItemRow,
} from '../../src/modules/budget-management/ports/budget-item-write.repository.js';

const OWNER = '00000000-0000-0000-0000-000000000001';
const EVENT = '00000000-0000-0000-0000-0000000000e1';
const BUDGET = '00000000-0000-0000-0000-0000000000b1';
const ITEM = '00000000-0000-0000-0000-0000000000a1';
const CORR = 'corr-us036-unit';

function mkCtxReader(
  ctx: {
    eventStatus: 'draft' | 'active' | 'cancelled' | 'completed';
    budgetId?: string;
  } | null,
): EventBudgetContextReader {
  return {
    find: async () => (ctx === null ? null : { eventStatus: ctx.eventStatus, budgetId: ctx.budgetId ?? BUDGET }),
  };
}

function mkCategoryReader(
  activeCodes: string[] = ['catering', 'venue'],
  codeToId: Record<string, string | null> = {},
): ServiceCategoryReadPort {
  return {
    getActiveCodes: async () => new Set(activeCodes),
    findIdByCode: async (code) =>
      codeToId[code] !== undefined ? codeToId[code] : activeCodes.includes(code) ? `sc-${code}` : null,
    findManyByCodes: async (codes) =>
      codes.map((code) => ({ code, name: code, isActive: activeCodes.includes(code) })),
  };
}

function mkBookingReader(pending = false): BookingIntentReadPort {
  return {
    findPendingByEventAndCategory: async () => (pending ? [{ id: 'bi-1' }] : []),
  };
}

function mkWriteRepo(overrides: Partial<BudgetItemWriteRepository> = {}): BudgetItemWriteRepository {
  return {
    create: async (_tx, input) =>
      ({
        id: 'new-item-id',
        budgetId: input.budgetId,
        label: input.label,
        categoryCode: input.categoryCode,
        amountPlanned: input.amountPlanned,
        amountCommitted: input.amountCommitted,
      }) as BudgetItemRow,
    update: async (_tx, itemId, input) =>
      ({
        id: itemId,
        budgetId: BUDGET,
        label: input.label ?? 'existing',
        categoryCode: input.categoryCode !== undefined ? input.categoryCode : 'catering',
        amountPlanned: input.amountPlanned ?? 100,
        amountCommitted: 50,
      }) as BudgetItemRow,
    hardDelete: async () => undefined,
    recomputeBudgetTotals: async () => undefined,
    findReplaceableAiItems: async () => [],
    hardDeleteMany: async () => undefined,
    createManyForRecommendation: async () => [],
    ...overrides,
  };
}

function mkPrismaMock(existingItem: Record<string, unknown> | null = null): {
  $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  budgetItem: { findFirst: () => Promise<unknown> };
} {
  return {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => fn({}),
    budgetItem: { findFirst: async (): Promise<unknown> => existingItem },
  } as unknown as {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    budgetItem: { findFirst: () => Promise<unknown> };
  };
}

// ────────────────────────────────────────────────────────────────────────
describe('US-036 QA-001 CreateBudgetItemUseCase (R1)', () => {
  it('UT-03 crea con amount_committed = 0 por defecto y ejecuta recompute totals', async () => {
    const writeRepo = mkWriteRepo();
    const recomputeSpy = vi.spyOn(writeRepo, 'recomputeBudgetTotals');
    const createSpy = vi.spyOn(writeRepo, 'create');
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    const result = await uc.execute({
      actorId: OWNER,
      eventId: EVENT,
      body: { label: 'Catering', category_code: 'catering', amount_planned: 100 },
      correlationId: CORR,
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amountCommitted: 0, categoryCode: 'catering' }),
    );
    expect(recomputeSpy).toHaveBeenCalledWith(expect.anything(), BUDGET);
    expect(result.amount_committed).toBe(0);
  });

  it('acepta amount_committed provisto en el body', async () => {
    const writeRepo = mkWriteRepo();
    const createSpy = vi.spyOn(writeRepo, 'create');
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'active' }),
      mkCategoryReader(),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await uc.execute({
      actorId: OWNER,
      eventId: EVENT,
      body: { label: 'x', amount_planned: 100, amount_committed: 42 },
      correlationId: CORR,
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amountCommitted: 42 }),
    );
  });

  it('VR-03 rechaza category_code fuera del whitelist activo → InvalidCategoryCodeError', async () => {
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(['catering']),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        body: { label: 'x', category_code: 'unknown', amount_planned: 0 },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(InvalidCategoryCodeError);
  });

  it('SEC-06 masked 404 cuando ctx reader devuelve null', async () => {
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader(null),
      mkCategoryReader(),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        body: { label: 'x', amount_planned: 0 },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('UT-09 AC-06 bloquea en event.status = cancelled', async () => {
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'cancelled' }),
      mkCategoryReader(),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        body: { label: 'x', amount_planned: 0 },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(EventNotEditableError);
  });

  it('UT-09 AC-06 bloquea en event.status = completed', async () => {
    const uc = new CreateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'completed' }),
      mkCategoryReader(),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        body: { label: 'x', amount_planned: 0 },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(EventNotEditableError);
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('US-036 QA-001 UpdateBudgetItemUseCase (R1)', () => {
  const existing = {
    id: ITEM,
    budgetId: BUDGET,
    label: 'Catering',
    categoryCode: 'catering',
    amountPlanned: { toNumber: () => 100 },
    amountCommitted: { toNumber: () => 0 },
  };

  it('happy path: actualiza label y ejecuta recompute solo si amount_planned cambia', async () => {
    const writeRepo = mkWriteRepo();
    const recomputeSpy = vi.spyOn(writeRepo, 'recomputeBudgetTotals');
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await uc.execute({
      actorId: OWNER,
      eventId: EVENT,
      itemId: ITEM,
      body: { label: 'Nuevo' }, // solo label — no cambia amount_planned
      correlationId: CORR,
    });
    expect(recomputeSpy).not.toHaveBeenCalled();
  });

  it('recompute totals se ejecuta cuando amount_planned cambia', async () => {
    const writeRepo = mkWriteRepo();
    const recomputeSpy = vi.spyOn(writeRepo, 'recomputeBudgetTotals');
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await uc.execute({
      actorId: OWNER,
      eventId: EVENT,
      itemId: ITEM,
      body: { amount_planned: 200 },
      correlationId: CORR,
    });
    expect(recomputeSpy).toHaveBeenCalledOnce();
  });

  it('UT-08 D5 bloquea cambio de category_code cuando amount_committed > 0', async () => {
    const withCommitted = {
      ...existing,
      amountCommitted: { toNumber: () => 50 },
    };
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'active' }),
      mkCategoryReader(['catering', 'venue']),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(withCommitted),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        itemId: ITEM,
        body: { category_code: 'venue' },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(ItemCategoryLockedError);
  });

  it('permite cambio de category_code cuando amount_committed = 0', async () => {
    const writeRepo = mkWriteRepo();
    const updateSpy = vi.spyOn(writeRepo, 'update');
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(['catering', 'venue']),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await uc.execute({
      actorId: OWNER,
      eventId: EVENT,
      itemId: ITEM,
      body: { category_code: 'venue' },
      correlationId: CORR,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.anything(),
      ITEM,
      expect.objectContaining({ categoryCode: 'venue' }),
    );
  });

  it('VR-03 rechaza category_code fuera de whitelist activa', async () => {
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(['catering']),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        itemId: ITEM,
        body: { category_code: 'unknown' },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(InvalidCategoryCodeError);
  });

  it('VR-07 cross-event/soft-delete → 404 masked cuando findFirst devuelve null', async () => {
    const uc = new UpdateBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(null),
    );
    await expect(
      uc.execute({
        actorId: OWNER,
        eventId: EVENT,
        itemId: ITEM,
        body: { label: 'x' },
        correlationId: CORR,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ────────────────────────────────────────────────────────────────────────
describe('US-036 QA-001 DeleteBudgetItemUseCase (R1)', () => {
  const existing = {
    id: ITEM,
    label: 'Catering',
    categoryCode: 'catering',
    amountPlanned: { toNumber: () => 100 },
    amountCommitted: { toNumber: () => 0 },
  };

  it('happy path: hard delete + recompute + telemetría con snapshot pre-delete', async () => {
    const writeRepo = mkWriteRepo();
    const hardDeleteSpy = vi.spyOn(writeRepo, 'hardDelete');
    const recomputeSpy = vi.spyOn(writeRepo, 'recomputeBudgetTotals');
    const telemetry = new BudgetItemTelemetry();
    const emitSpy = vi.spyOn(telemetry, 'emitDeleted');
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      mkBookingReader(false),
      writeRepo,
      telemetry,
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR });
    expect(hardDeleteSpy).toHaveBeenCalledWith(expect.anything(), ITEM);
    expect(recomputeSpy).toHaveBeenCalledWith(expect.anything(), BUDGET);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: ITEM,
        label: 'Catering',
        categoryCode: 'catering',
        amountPlanned: 100,
        amountCommitted: 0,
      }),
    );
  });

  it('UT-05 bloquea DELETE con amount_committed > 0 → ItemHasCommitmentError', async () => {
    const withCommitted = { ...existing, amountCommitted: { toNumber: () => 500 } };
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      mkBookingReader(false),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(withCommitted),
    );
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR }),
    ).rejects.toBeInstanceOf(ItemHasCommitmentError);
  });

  it('UT-07 cross-module: BookingIntent.pending → ItemHasPendingIntentError', async () => {
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(['catering']),
      mkBookingReader(true), // pending devuelve 1
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR }),
    ).rejects.toBeInstanceOf(ItemHasPendingIntentError);
  });

  it('UT-R1 edge: category_code = null → cross-module check se omite (delete procede)', async () => {
    const withNullCode = { ...existing, categoryCode: null };
    const writeRepo = mkWriteRepo();
    const hardDeleteSpy = vi.spyOn(writeRepo, 'hardDelete');
    const bookingReader = mkBookingReader(false);
    const findPendingSpy = vi.spyOn(bookingReader, 'findPendingByEventAndCategory');
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      bookingReader,
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(withNullCode),
    );
    await uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR });
    expect(findPendingSpy).not.toHaveBeenCalled();
    expect(hardDeleteSpy).toHaveBeenCalled();
  });

  it('UT-R1 edge: category_code no matchea whitelist → cross-module omitido (findIdByCode retorna null)', async () => {
    const withUnknownCode = { ...existing, categoryCode: 'unknown-code' };
    const writeRepo = mkWriteRepo();
    const hardDeleteSpy = vi.spyOn(writeRepo, 'hardDelete');
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(['catering'], { 'unknown-code': null }),
      mkBookingReader(false),
      writeRepo,
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(withUnknownCode),
    );
    await uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR });
    expect(hardDeleteSpy).toHaveBeenCalled();
  });

  it('UT-09 AC-06 bloquea DELETE en event.status = completed', async () => {
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'completed' }),
      mkCategoryReader(),
      mkBookingReader(false),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(existing),
    );
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR }),
    ).rejects.toBeInstanceOf(EventNotEditableError);
  });

  it('SEC-06 masked 404 cuando ctx reader devuelve null', async () => {
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader(null),
      mkCategoryReader(),
      mkBookingReader(false),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(),
    );
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('VR-07 cross-event/item ausente → 404 masked', async () => {
    const uc = new DeleteBudgetItemUseCase(
      mkCtxReader({ eventStatus: 'draft' }),
      mkCategoryReader(),
      mkBookingReader(false),
      mkWriteRepo(),
      new BudgetItemTelemetry(),
      // @ts-expect-error mock
      mkPrismaMock(null),
    );
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, itemId: ITEM, correlationId: CORR }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
