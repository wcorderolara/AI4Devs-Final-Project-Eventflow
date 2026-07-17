// US-064 (PB-P1-037 / QA-001) — Unit tests del shape extendido del `GetBudgetUseCase`.
//
// Cubre (Tech Spec §7 + AC-02/AC-04/EC-02):
//   - `summary.available = totalPlanned - totalCommitted` (con signo — negativo en over_committed).
//   - `items[].diff = amount_planned - amount_committed` (con signo).
//   - `items[].auto_created` heurística `planned=0 && committed>0` (US-039 auto-created).
//   - `last_updated_at` en ISO 8601 desde `Budget.updated_at`.
//   - Sort de items por `amount_committed DESC` con desempates estables.
import { describe, it, expect } from 'vitest';
import { GetBudgetUseCase } from '../../src/modules/budget-management/application/get-budget.use-case.js';
import { StaticCurrencyReadAdapter } from '../../src/modules/budget-management/infrastructure/static-currency-read.adapter.js';
import type { BudgetAggregateView } from '../../src/modules/budget-management/domain/budget-view.js';
import type { BudgetReadRepository } from '../../src/modules/budget-management/ports/budget-read.repository.js';

const OWNER = '00000000-0000-0000-0000-0000000000ff';
const EVENT = '00000000-0000-0000-0000-0000000000ee';
const CORRELATION = '00000000-0000-0000-0000-000000000c01';

function repoOf(aggregate: BudgetAggregateView): BudgetReadRepository {
  return {
    isOwnedEvent: async () => true,
    getByEventId: async () => aggregate,
  };
}

function baseView(overrides: Partial<BudgetAggregateView> = {}): BudgetAggregateView {
  return {
    budgetId: '00000000-0000-0000-0000-0000000000b1',
    totalPlanned: 10000,
    totalCommitted: 4000,
    currency: 'USD',
    items: [],
    updatedAt: new Date('2026-07-17T18:00:00Z'),
    ...overrides,
  };
}

describe('US-064 · GetBudgetUseCase — shape extendido', () => {
  it('AC-02: `summary.available = totalPlanned - totalCommitted` (positivo, sin exceso)', async () => {
    const uc = new GetBudgetUseCase(repoOf(baseView()), new StaticCurrencyReadAdapter());
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary.available).toBe(6000);
    expect(result.summary.over_committed).toBe(false);
  });

  it('AC-02: `summary.available` es NEGATIVO cuando `over_committed = true`', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(baseView({ totalPlanned: 100, totalCommitted: 250 })),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary.available).toBe(-150);
    expect(result.summary.over_committed).toBe(true);
  });

  it('AC-02: cada item incluye `diff` con signo', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          totalPlanned: 1000,
          totalCommitted: 800,
          items: [
            { id: '00000000-0000-0000-0000-000000000001', label: 'A', categoryCode: null, amountPlanned: 500, amountCommitted: 200 },
            { id: '00000000-0000-0000-0000-000000000002', label: 'B', categoryCode: null, amountPlanned: 500, amountCommitted: 600 },
          ],
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    // Después del sort DESC: B (committed=600) primero, A (committed=200) segundo.
    expect(result.items[0]!.diff).toBe(-100);
    expect(result.items[0]!.over_committed).toBe(true);
    expect(result.items[1]!.diff).toBe(300);
    expect(result.items[1]!.over_committed).toBe(false);
  });

  it('EC-02 heurística `auto_created`: `planned=0 && committed>0` ⇒ true', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          totalPlanned: 0,
          totalCommitted: 100,
          items: [
            { id: '00000000-0000-0000-0000-000000000001', label: 'Auto', categoryCode: 'catering', amountPlanned: 0, amountCommitted: 100 },
          ],
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items[0]!.auto_created).toBe(true);
  });

  it('EC-02 heurística `auto_created`: `planned>0` ⇒ false (aunque `committed>0`)', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          items: [
            { id: '00000000-0000-0000-0000-000000000001', label: 'Manual', categoryCode: null, amountPlanned: 100, amountCommitted: 50 },
          ],
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items[0]!.auto_created).toBe(false);
  });

  it('EC-02 heurística `auto_created`: `committed=0` ⇒ false (no hay compromiso)', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          items: [
            { id: '00000000-0000-0000-0000-000000000001', label: 'Empty', categoryCode: null, amountPlanned: 0, amountCommitted: 0 },
          ],
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items[0]!.auto_created).toBe(false);
  });

  it('AC-02: `last_updated_at` desde `Budget.updated_at` en ISO 8601', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(baseView({ updatedAt: new Date('2026-07-17T21:15:00Z') })),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.last_updated_at).toBe('2026-07-17T21:15:00.000Z');
  });

  it('AC-02: `last_updated_at = null` cuando el repositorio no expone timestamp (defensa profunda)', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(baseView({ updatedAt: null })),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.last_updated_at).toBeNull();
  });

  it('AC-02 sort: items ordenados por `amount_committed DESC`', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          items: [
            { id: '00000000-0000-0000-0000-000000000001', label: 'Low', categoryCode: null, amountPlanned: 100, amountCommitted: 10 },
            { id: '00000000-0000-0000-0000-000000000002', label: 'High', categoryCode: null, amountPlanned: 100, amountCommitted: 90 },
            { id: '00000000-0000-0000-0000-000000000003', label: 'Mid', categoryCode: null, amountPlanned: 100, amountCommitted: 50 },
          ],
          totalPlanned: 300,
          totalCommitted: 150,
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items.map((i) => i.label)).toEqual(['High', 'Mid', 'Low']);
  });

  it('AC-02 sort: desempate estable por (`amount_planned DESC`, `id ASC`)', async () => {
    const uc = new GetBudgetUseCase(
      repoOf(
        baseView({
          items: [
            { id: '00000000-0000-0000-0000-0000000000c1', label: 'C', categoryCode: null, amountPlanned: 100, amountCommitted: 100 },
            { id: '00000000-0000-0000-0000-0000000000a1', label: 'A', categoryCode: null, amountPlanned: 200, amountCommitted: 100 },
            { id: '00000000-0000-0000-0000-0000000000b1', label: 'B', categoryCode: null, amountPlanned: 100, amountCommitted: 100 },
          ],
          totalPlanned: 400,
          totalCommitted: 300,
        }),
      ),
      new StaticCurrencyReadAdapter(),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    // Empate en committed=100 ⇒ A (planned=200) primero; luego B (id<C).
    expect(result.items.map((i) => i.label)).toEqual(['A', 'B', 'C']);
  });
});
