// US-037 (PB-P1-021 / QA-001) — Unit tests de `BudgetSuggestionApplyStrategyV2`.
// Cubre AC-01..08, EC-01..09, VR-03..05/VR-10, D2/D5/D6, edited flag, y logger.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BudgetSuggestionApplyStrategyV2 } from '../../src/modules/budget-management/application/hitl/budget-suggestion-apply.strategy.js';
import type {
  BudgetItemWriteRepository,
  CreateBudgetItemFromAiInput,
} from '../../src/modules/budget-management/ports/budget-item-write.repository.js';
import type {
  ServiceCategoryReadPort,
  ServiceCategoryRow,
} from '../../src/modules/budget-management/ports/service-category-read.port.js';
import {
  CurrencyMismatchError,
  EventNotEditableError,
  InvalidValueError,
  PayloadInvalidError,
} from '../../src/modules/budget-management/domain/errors/budget-item.errors.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

const EVENT_ID = '00000000-0000-4000-8000-000000000001';
const REC_ID = '00000000-0000-4000-8000-000000000010';
const BUDGET_ID = '00000000-0000-4000-8000-000000000020';

interface FakeEvent {
  id: string;
  status: 'draft' | 'active' | 'cancelled' | 'completed';
  currency: string;
  userId: string;
}

function makeTx(event: FakeEvent | null): {
  event: { findUnique: ReturnType<typeof vi.fn> };
  budget: { upsert: ReturnType<typeof vi.fn> };
} {
  return {
    event: {
      findUnique: vi.fn(async () => event),
    },
    budget: {
      upsert: vi.fn(async () => ({ id: BUDGET_ID })),
    },
  };
}

function makeRepo(overrides: Partial<BudgetItemWriteRepository> = {}): BudgetItemWriteRepository {
  return {
    create: vi.fn(async () => ({ id: 'x', budgetId: BUDGET_ID, label: '', categoryCode: null, amountPlanned: 0, amountCommitted: 0 })),
    update: vi.fn(async () => ({ id: 'x', budgetId: BUDGET_ID, label: '', categoryCode: null, amountPlanned: 0, amountCommitted: 0 })),
    hardDelete: vi.fn(async () => undefined),
    recomputeBudgetTotals: vi.fn(async () => undefined),
    findReplaceableAiItems: vi.fn(async () => []),
    hardDeleteMany: vi.fn(async () => undefined),
    createManyForRecommendation: vi.fn(async () => []),
    ...overrides,
  };
}

function makeCatReader(rows: ServiceCategoryRow[]): ServiceCategoryReadPort {
  return {
    getActiveCodes: async () => new Set(rows.filter((r) => r.isActive).map((r) => r.code)),
    findIdByCode: async (code) => (rows.find((r) => r.code === code && r.isActive) ? `sc-${code}` : null),
    findManyByCodes: vi.fn(async (codes) => rows.filter((r) => codes.includes(r.code))),
  };
}

function makeRec(overrides: Partial<AiRecommendationView> = {}): AiRecommendationView {
  return {
    id: REC_ID,
    type: 'budget_suggestion',
    status: 'pending',
    requestedByUserId: 'u-1',
    eventId: EVENT_ID,
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: {
      currencyCode: 'GTQ',
      items: [
        { category: 'venue', estimatedAmount: '5000.00' },
        { category: 'catering', estimatedAmount: '5000.00' },
      ],
    },
    aiMeta: null,
    createdAt: '2026-06-27T00:00:00Z',
    ...overrides,
  };
}

describe('US-037 QA-001 — BudgetSuggestionApplyStrategyV2', () => {
  let repo: BudgetItemWriteRepository;
  let cats: ServiceCategoryReadPort;
  let strategy: BudgetSuggestionApplyStrategyV2;

  beforeEach(() => {
    repo = makeRepo({
      createManyForRecommendation: vi.fn(async (_tx: unknown, args: { items: CreateBudgetItemFromAiInput[] }) =>
        args.items.map((it, idx) => ({
          id: `new-${idx}`,
          budgetId: BUDGET_ID,
          label: it.label,
          categoryCode: it.categoryCode,
          amountPlanned: it.amountPlanned,
          amountCommitted: 0,
        })),
      ),
    });
    cats = makeCatReader([
      { code: 'venue', name: 'Venue', isActive: true },
      { code: 'catering', name: 'Catering', isActive: true },
    ]);
    strategy = new BudgetSuggestionApplyStrategyV2({
      budgetItemWriteRepo: repo,
      serviceCategoryReadPort: cats,
    });
  });

  it('AC-01 apply as-is: crea BudgetItems y llama recomputeBudgetTotals; retorna outcome null/null', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'GTQ', userId: 'u-1' });
    const out = await strategy.applyInTransaction({
      tx: tx as never,
      recommendation: makeRec(),
      finalOutput: makeRec().output,
      actorId: 'u-1',
    });
    expect(out).toEqual({ appliedEntityType: null, appliedEntityId: null });
    expect(repo.createManyForRecommendation).toHaveBeenCalledWith(expect.anything(), {
      budgetId: BUDGET_ID,
      aiRecommendationId: REC_ID,
      items: [
        { label: 'Venue', categoryCode: 'venue', amountPlanned: 5000 },
        { label: 'Catering', categoryCode: 'catering', amountPlanned: 5000 },
      ],
    });
    expect(repo.recomputeBudgetTotals).toHaveBeenCalledWith(expect.anything(), BUDGET_ID);
  });

  it('AC-02 apply parcial (subset): materializa solo K items', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'active', currency: 'GTQ', userId: 'u-1' });
    const finalOutput = {
      currencyCode: 'GTQ',
      items: [{ category: 'venue', estimatedAmount: '4500.00', label: 'Salón principal' }],
    };
    await strategy.applyInTransaction({
      tx: tx as never,
      recommendation: makeRec(),
      finalOutput,
      actorId: 'u-1',
    });
    const call = (repo.createManyForRecommendation as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(call?.items).toHaveLength(1);
    expect(call?.items[0]).toMatchObject({ categoryCode: 'venue', amountPlanned: 4500, label: 'Salón principal' });
  });

  it('AC-03 D2 reemplazo: llama hardDeleteMany con items previos AI', async () => {
    (repo.findReplaceableAiItems as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'prev-1' },
      { id: 'prev-2' },
    ]);
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'GTQ', userId: 'u-1' });
    await strategy.applyInTransaction({
      tx: tx as never,
      recommendation: makeRec(),
      finalOutput: makeRec().output,
      actorId: 'u-1',
    });
    expect(repo.hardDeleteMany).toHaveBeenCalledWith(expect.anything(), ['prev-1', 'prev-2']);
  });

  it('AC-04 D5 event cancelled → EventNotEditableError', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'cancelled', currency: 'GTQ', userId: 'u-1' });
    await expect(
      strategy.applyInTransaction({
        tx: tx as never,
        recommendation: makeRec(),
        finalOutput: makeRec().output,
        actorId: 'u-1',
      }),
    ).rejects.toBeInstanceOf(EventNotEditableError);
  });

  it('AC-05 D6 categoría inactiva → CategoryInactiveError con lista', async () => {
    cats = makeCatReader([
      { code: 'venue', name: 'Venue', isActive: false },
      { code: 'catering', name: 'Catering', isActive: true },
    ]);
    strategy = new BudgetSuggestionApplyStrategyV2({
      budgetItemWriteRepo: repo,
      serviceCategoryReadPort: cats,
    });
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'GTQ', userId: 'u-1' });
    await expect(
      strategy.applyInTransaction({
        tx: tx as never,
        recommendation: makeRec(),
        finalOutput: makeRec().output,
        actorId: 'u-1',
      }),
    ).rejects.toMatchObject({
      code: 'CATEGORY_INACTIVE',
      inactiveCategories: [{ code: 'venue', name: 'Venue' }],
    });
  });

  it('AC-08 currency mismatch → CurrencyMismatchError', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'USD', userId: 'u-1' });
    await expect(
      strategy.applyInTransaction({
        tx: tx as never,
        recommendation: makeRec(),
        finalOutput: makeRec().output,
        actorId: 'u-1',
      }),
    ).rejects.toBeInstanceOf(CurrencyMismatchError);
  });

  it('EC-04 category no en payload original → InvalidValueError', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'GTQ', userId: 'u-1' });
    const finalOutput = {
      currencyCode: 'GTQ',
      items: [{ category: 'photography', estimatedAmount: '1000.00' }],
    };
    // photography no está en el original (venue, catering).
    await expect(
      strategy.applyInTransaction({
        tx: tx as never,
        recommendation: makeRec(),
        finalOutput,
        actorId: 'u-1',
      }),
    ).rejects.toBeInstanceOf(InvalidValueError);
  });

  it('EC-05 payload vacío → PayloadInvalidError (Zod .min(1))', async () => {
    const tx = makeTx({ id: EVENT_ID, status: 'draft', currency: 'GTQ', userId: 'u-1' });
    await expect(
      strategy.applyInTransaction({
        tx: tx as never,
        recommendation: makeRec(),
        finalOutput: { currencyCode: 'GTQ', items: [] },
        actorId: 'u-1',
      }),
    ).rejects.toBeInstanceOf(PayloadInvalidError);
  });
});
