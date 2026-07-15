// US-035 QA-001 + US-036 QA-001 — Tests unitarios de hooks TanStack Query del presupuesto.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/msw/server';
import { useEventBudget } from '@/features/budget/view/hooks/useEventBudget';
import {
  useCreateBudgetItem,
  useDeleteBudgetItem,
  useUpdateBudgetItem,
} from '@/features/budget/mutate/hooks/useBudgetItemMutations';

const EV = 'ev-1';

function wrap(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('US-035 — useEventBudget', () => {
  afterEach(() => server.resetHandlers());

  it('carga el presupuesto y usa la queryKey canónica', async () => {
    server.use(
      http.get(`*/api/v1/events/${EV}/budget`, () =>
        HttpResponse.json({
          data: {
            summary: { currency_code: 'USD', total_planned: 100, total_committed: 50, over_committed: false },
            items: [],
          },
          meta: { correlationId: 'c-1', timestamp: '2026-07-14T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useEventBudget(EV), { wrapper: wrap(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(['event', EV, 'budget'])).toBeDefined();
  });
});

describe('US-036 — mutations invalidan queryKey canónica', () => {
  afterEach(() => server.resetHandlers());

  it('useCreateBudgetItem invalida ["event", eventId, "budget"] tras éxito', async () => {
    server.use(
      http.post(`*/api/v1/events/${EV}/budget/items`, () =>
        HttpResponse.json({
          data: { id: 'new-1', label: 'x', category_code: null, amount_planned: 0, amount_committed: 0 },
          meta: { correlationId: 'c-1', timestamp: '2026-07-14T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useCreateBudgetItem(EV), { wrapper: wrap(qc) });
    result.current.mutate({ label: 'Test', amount_planned: 100 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['event', EV, 'budget'] });
  });

  it('useUpdateBudgetItem invalida tras éxito', async () => {
    server.use(
      http.patch(`*/api/v1/events/${EV}/budget/items/i1`, () =>
        HttpResponse.json({
          data: { id: 'i1', label: 'y', category_code: null, amount_planned: 200, amount_committed: 0 },
          meta: { correlationId: 'c-1', timestamp: '2026-07-14T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateBudgetItem(EV), { wrapper: wrap(qc) });
    result.current.mutate({ itemId: 'i1', body: { amount_planned: 200 } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['event', EV, 'budget'] });
  });

  it('useDeleteBudgetItem invalida tras éxito', async () => {
    server.use(
      http.delete(`*/api/v1/events/${EV}/budget/items/i1`, () => new HttpResponse(null, { status: 204 })),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteBudgetItem(EV), { wrapper: wrap(qc) });
    result.current.mutate({ itemId: 'i1' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['event', EV, 'budget'] });
  });
});
