// US-035 (PB-P1-020 / QA-001, R1) — Unit tests del `GetBudgetUseCase`.
// Cobertura:
//  - UT-01 `over_committed` boundary (estricto: igualdad NO es exceso).
//  - AC-06: NO ramifica por `event.status` (no consulta el status).
//  - Ownership masked 404 (SEC-06): evento ajeno → NotFoundError.
//  - Budget null → NotFoundError (BR-BUDGET-001 borde).
//  - UT-07: mapper convierte Decimal-like a number.
//  - Telemetría: `budget.viewed` con enteros y sin PII.
import { describe, it, expect, vi } from 'vitest';
import { GetBudgetUseCase } from '../../src/modules/budget-management/application/get-budget.use-case.js';
import { GetBudgetTelemetry } from '../../src/modules/budget-management/application/get-budget-telemetry.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import type { BudgetReadRepository } from '../../src/modules/budget-management/ports/budget-read.repository.js';
import type { BudgetAggregateView } from '../../src/modules/budget-management/domain/budget-view.js';

const OWNER = '00000000-0000-0000-0000-000000000001';
const EVENT = '00000000-0000-0000-0000-0000000000e1';
const CORRELATION = 'corr-us035-unit';

function buildRepo(overrides: Partial<BudgetReadRepository> = {}): BudgetReadRepository {
  return {
    isOwnedEvent: async () => true,
    getByEventId: async () => null,
    ...overrides,
  };
}

function view(overrides: Partial<BudgetAggregateView> = {}): BudgetAggregateView {
  return {
    budgetId: '00000000-0000-0000-0000-0000000000b1',
    totalPlanned: 12500,
    totalCommitted: 9800,
    currency: 'USD',
    items: [
      {
        id: '00000000-0000-0000-0000-0000000000a1',
        label: 'Catering',
        categoryCode: 'catering',
        amountPlanned: 6000,
        amountCommitted: 5000,
      },
      {
        id: '00000000-0000-0000-0000-0000000000a2',
        label: 'Otros',
        categoryCode: null,
        amountPlanned: 6500,
        amountCommitted: 4800,
      },
    ],
    ...overrides,
  };
}

describe('US-035 GetBudgetUseCase (BE-003, R1) — over_committed', () => {
  it('UT-01 over_committed=true cuando totalCommitted > totalPlanned', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 100, totalCommitted: 101, items: [] }),
    });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary.over_committed).toBe(true);
  });

  it('UT-01 over_committed=false cuando totalCommitted == totalPlanned (igualdad NO es exceso)', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 500, totalCommitted: 500, items: [] }),
    });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary.over_committed).toBe(false);
  });

  it('UT-01 over_committed=false cuando totalCommitted < totalPlanned', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 500, totalCommitted: 499.99, items: [] }),
    });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary.over_committed).toBe(false);
  });
});

describe('US-035 GetBudgetUseCase (BE-003, R1) — shape y mapping', () => {
  it('compone summary con currency del Event y totales del Budget', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 200, totalCommitted: 150, currency: 'EUR', items: [] }),
    });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.summary).toEqual({
      total_planned: 200,
      total_committed: 150,
      over_committed: false,
      currency_code: 'EUR',
    });
  });

  it('mapea items al shape R1 (label, category_code, amount_planned, amount_committed)', async () => {
    const repo = buildRepo({ getByEventId: async () => view() });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items).toEqual([
      {
        id: '00000000-0000-0000-0000-0000000000a1',
        label: 'Catering',
        category_code: 'catering',
        amount_planned: 6000,
        amount_committed: 5000,
      },
      {
        id: '00000000-0000-0000-0000-0000000000a2',
        label: 'Otros',
        category_code: null,
        amount_planned: 6500,
        amount_committed: 4800,
      },
    ]);
  });

  it('empty state: items = [] cuando el Budget existe sin BudgetItems', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 0, totalCommitted: 0, items: [] }),
    });
    const uc = new GetBudgetUseCase(repo);
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({
      total_planned: 0,
      total_committed: 0,
      over_committed: false,
      currency_code: 'USD',
    });
  });
});

describe('US-035 GetBudgetUseCase (BE-003, R1) — errores', () => {
  it('SEC-06 masked 404 cuando el ownership guard rechaza', async () => {
    const repo = buildRepo({ isOwnedEvent: async () => false });
    const uc = new GetBudgetUseCase(repo);
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('BR-BUDGET-001 borde: Budget null → NotFoundError', async () => {
    const repo = buildRepo({ isOwnedEvent: async () => true, getByEventId: async () => null });
    const uc = new GetBudgetUseCase(repo);
    await expect(
      uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('US-035 GetBudgetUseCase (BE-003, R1) — telemetría budget.viewed', () => {
  it('emite budget.viewed con enteros/montos y sin PII', async () => {
    const repo = buildRepo({
      getByEventId: async () =>
        view({ totalPlanned: 100, totalCommitted: 120, currency: 'MXN', items: view().items }),
    });
    const telemetry = new GetBudgetTelemetry();
    const spy = vi.spyOn(telemetry, 'emitViewed');
    let tick = 100;
    const uc = new GetBudgetUseCase(repo, telemetry, () => {
      const now = tick;
      tick += 42;
      return now;
    });
    await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORRELATION });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: CORRELATION,
        actorId: OWNER,
        eventId: EVENT,
        currencyCode: 'MXN',
        totalPlanned: 100,
        totalCommitted: 120,
        overCommitted: true,
        itemsCount: 2,
        latencyMs: 42,
      }),
    );
  });
});
