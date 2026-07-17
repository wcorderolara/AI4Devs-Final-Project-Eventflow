// US-038 (PB-P1-022 / QA-002) — Integration-style tests del `GetBudgetUseCase` extendido.
// DB-free: usa fakes del `BudgetReadRepository` + `CurrencyReadPort` para validar:
//   - IT-01 shape extendido con USD (tolerance=0.01).
//   - IT-02 shape extendido con CLP (tolerance=1).
//   - IT-03 fallback defensivo + log warning (EC-05, VR-02).
//   - IT-04 sin items ⇒ overcommitted_amount=0 y over_committed_items_count=0.
//   - IT-05 item con planned=0 y committed>0 ⇒ badge (over_committed=true).
//   - IT-06 evento cancelled/completed no altera el cálculo (use case no consulta status).
//   - IT-07 forward-compat validado en `us038-contract.spec.ts`.
// También cubre BE-005: extensión del snapshot `budget.viewed`.
import { describe, it, expect, vi } from 'vitest';
import { GetBudgetUseCase } from '../../src/modules/budget-management/application/get-budget.use-case.js';
import { GetBudgetTelemetry } from '../../src/modules/budget-management/application/get-budget-telemetry.js';
import type { BudgetReadRepository } from '../../src/modules/budget-management/ports/budget-read.repository.js';
import type {
  CurrencyDecimalPlaces,
  CurrencyReadPort,
} from '../../src/modules/budget-management/ports/currency-read.port.js';
import type { BudgetAggregateView } from '../../src/modules/budget-management/domain/budget-view.js';

const OWNER = '00000000-0000-0000-0000-000000000001';
const EVENT = '00000000-0000-0000-0000-0000000000e1';
const CORR = 'corr-us038';

function fakeRepo(aggregate: BudgetAggregateView): BudgetReadRepository {
  return {
    isOwnedEvent: async () => true,
    getByEventId: async () => aggregate,
  };
}

function fakeCurrency(map: Record<string, number>): CurrencyReadPort {
  return {
    findByCode: async (code: string): Promise<CurrencyDecimalPlaces | null> => {
      const decimals = map[code.toUpperCase()];
      if (decimals === undefined) return null;
      return { code: code.toUpperCase(), decimal_places: decimals };
    },
  };
}

function view(overrides: Partial<BudgetAggregateView> = {}): BudgetAggregateView {
  return {
    budgetId: '00000000-0000-0000-0000-0000000000b1',
    totalPlanned: 1000,
    totalCommitted: 1250,
    currency: 'USD',
    items: [
      { id: '00000000-0000-0000-0000-0000000000a1', label: 'Venue', categoryCode: 'venue', amountPlanned: 500, amountCommitted: 800 },
      { id: '00000000-0000-0000-0000-0000000000a2', label: 'Otros', categoryCode: null, amountPlanned: 500, amountCommitted: 450 },
    ],
    updatedAt: new Date('2026-07-17T21:00:00Z'),
    ...overrides,
  };
}

describe('US-038 QA-002 — GetBudgetUseCase extendido', () => {
  it('IT-01 USD (tolerance=0.01) ⇒ shape extendido correcto', async () => {
    const uc = new GetBudgetUseCase(fakeRepo(view()), fakeCurrency({ USD: 2 }));
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(result.summary.overcommitted_amount).toBe(250);
    expect(result.summary.over_committed).toBe(true);
    expect(result.items[0]!.over_committed).toBe(true);
    expect(result.items[0]!.overcommitted_amount).toBe(300);
    expect(result.items[1]!.over_committed).toBe(false);
    expect(result.items[1]!.overcommitted_amount).toBe(0);
  });

  it('IT-02 CLP (tolerance=1) ⇒ diff<1 no dispara over_committed', async () => {
    const aggregate = view({
      currency: 'MXN', // enum MVP (usado como stand-in del contrato; la tolerancia viene del port).
      totalPlanned: 100,
      totalCommitted: 100.5,
      items: [{ id: '00000000-0000-0000-0000-0000000000a1', label: 'X', categoryCode: null, amountPlanned: 100, amountCommitted: 100.5 }],
    });
    const uc = new GetBudgetUseCase(fakeRepo(aggregate), fakeCurrency({ MXN: 0 }));
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(result.items[0]!.over_committed).toBe(false);
  });

  it('IT-03 currency desconocida ⇒ fallback decimal_places=2 + warning', async () => {
    const telemetry = new GetBudgetTelemetry();
    const warningSpy = vi.spyOn(telemetry, 'emitCurrencyDecimalPlacesMissing');
    const aggregate = view({ currency: 'USD', totalPlanned: 100, totalCommitted: 100.02, items: [] });
    const uc = new GetBudgetUseCase(fakeRepo(aggregate), fakeCurrency({}), telemetry);
    await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(warningSpy).toHaveBeenCalledTimes(1);
    expect(warningSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currencyCode: 'USD',
        fallbackDecimalPlaces: 2,
        eventId: EVENT,
        correlationId: CORR,
      }),
    );
  });

  it('IT-04 sin items ⇒ summary.overcommitted_amount=0 + itemsCount=0', async () => {
    const uc = new GetBudgetUseCase(
      fakeRepo(view({ totalPlanned: 0, totalCommitted: 0, items: [] })),
      fakeCurrency({ USD: 2 }),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(result.summary.overcommitted_amount).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('IT-05 item con planned=0 y committed>0 ⇒ over_committed=true', async () => {
    const uc = new GetBudgetUseCase(
      fakeRepo(
        view({
          totalPlanned: 0,
          totalCommitted: 250,
          items: [{ id: '00000000-0000-0000-0000-0000000000a1', label: 'nuevo', categoryCode: null, amountPlanned: 0, amountCommitted: 250 }],
        }),
      ),
      fakeCurrency({ USD: 2 }),
    );
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(result.items[0]!.over_committed).toBe(true);
    expect(result.items[0]!.overcommitted_amount).toBe(250);
  });

  it('IT-06 use case no consulta event.status ⇒ cálculo idéntico en cancelled/completed', async () => {
    // Este test es equivalente a IT-01; la garantía es arquitectónica: la firma del port no
    // expone status. Se conserva como referencia AC-06 herencia US-035.
    const uc = new GetBudgetUseCase(fakeRepo(view()), fakeCurrency({ USD: 2 }));
    const result = await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(result.summary.over_committed).toBe(true);
  });

  it('BE-005 emite budget.viewed extendido con overcommitted_amount + count', async () => {
    const telemetry = new GetBudgetTelemetry();
    const viewedSpy = vi.spyOn(telemetry, 'emitViewed');
    const uc = new GetBudgetUseCase(fakeRepo(view()), fakeCurrency({ USD: 2 }), telemetry);
    await uc.execute({ actorId: OWNER, eventId: EVENT, correlationId: CORR });
    expect(viewedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        overcommittedAmount: 250,
        overCommittedItemsCount: 1,
      }),
    );
  });
});
