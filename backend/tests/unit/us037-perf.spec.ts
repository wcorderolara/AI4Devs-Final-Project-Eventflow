// US-037 (PB-P1-021 / QA-003 PERF-01) — Medición local de la strategy con 12 entradas.
// Target: P95 < 1.5 s (NFR-PERF-001). Este test corre la strategy en memoria (sin BD real)
// con mocks del `tx`, `repo` y `catReader`. La medición real end-to-end con Postgres vive en
// QA-002 (integration). Este PERF unit es guard de regresión temprana ante cambios en la
// lógica (loops, cómputos, allocations) que puedan degradar performance de forma sensible.
import { describe, expect, it, vi } from 'vitest';
import { BudgetSuggestionApplyStrategyV2 } from '../../src/modules/budget-management/application/hitl/budget-suggestion-apply.strategy.js';
import type {
  BudgetItemWriteRepository,
  CreateBudgetItemFromAiInput,
} from '../../src/modules/budget-management/ports/budget-item-write.repository.js';
import type { ServiceCategoryReadPort } from '../../src/modules/budget-management/ports/service-category-read.port.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

const CATEGORIES = [
  'venue', 'catering', 'photography', 'music', 'flowers', 'decoration',
  'lighting', 'transportation', 'attire', 'invitations', 'cake', 'gifts',
] as const;
const N = 12;
const REPS = 30;

function makeTx(): {
  event: { findUnique: () => Promise<{ id: string; status: string; currency: string; userId: string }> };
  budget: { upsert: () => Promise<{ id: string }> };
} {
  return {
    event: {
      findUnique: async () => ({
        id: 'ev-perf',
        status: 'draft',
        currency: 'GTQ',
        userId: 'u-perf',
      }),
    },
    budget: { upsert: async () => ({ id: 'b-perf' }) },
  };
}
function makeRepo(): BudgetItemWriteRepository {
  return {
    create: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
    recomputeBudgetTotals: async () => undefined,
    findReplaceableAiItems: async () => [],
    hardDeleteMany: async () => undefined,
    createManyForRecommendation: async (
      _tx: unknown,
      args: { items: CreateBudgetItemFromAiInput[] },
    ) =>
      args.items.map((it, i) => ({
        id: `x-${i}`,
        budgetId: 'b-perf',
        label: it.label,
        categoryCode: it.categoryCode,
        amountPlanned: it.amountPlanned,
        amountCommitted: 0,
      })),
  } as unknown as BudgetItemWriteRepository;
}
function makeCats(): ServiceCategoryReadPort {
  return {
    getActiveCodes: async () => new Set(CATEGORIES),
    findIdByCode: async () => 'sc-x',
    findManyByCodes: async (codes) => codes.map((code) => ({ code, name: code, isActive: true })),
  };
}
function makeRec(): AiRecommendationView {
  return {
    id: 'rec-perf',
    type: 'budget_suggestion',
    status: 'pending',
    requestedByUserId: 'u-perf',
    eventId: 'ev-perf',
    vendorProfileId: null,
    quoteRequestId: null,
    input: {},
    output: {
      currencyCode: 'GTQ',
      items: CATEGORIES.slice(0, N).map((c, i) => ({ category: c, estimatedAmount: String(500 + i * 10) })),
    },
    aiMeta: null,
    createdAt: '2026-06-27T00:00:00Z',
  };
}

describe('US-037 QA-003 — PERF-01 (12 entradas, mocks)', () => {
  it('P95 en-memoria < 100ms (guard de regresión local; el PERF end-to-end real es QA-002)', async () => {
    const strategy = new BudgetSuggestionApplyStrategyV2({
      budgetItemWriteRepo: makeRepo(),
      serviceCategoryReadPort: makeCats(),
    });
    const rec = makeRec();
    const durations: number[] = [];
    for (let i = 0; i < REPS; i += 1) {
      const t0 = performance.now();
      await strategy.applyInTransaction({ tx: makeTx() as never, recommendation: rec, finalOutput: rec.output, actorId: 'u-perf' });
      durations.push(performance.now() - t0);
    }
    durations.sort((a, b) => a - b);
    const p95Idx = Math.floor(durations.length * 0.95);
    const p95 = durations[p95Idx] ?? durations[durations.length - 1]!;
    // 100ms es MUY generoso para mocks; NFR real (1.5s end-to-end con BD) se valida en QA-002.
    expect(p95).toBeLessThan(100);
  });
});
