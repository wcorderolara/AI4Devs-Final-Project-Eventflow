// US-037 (PB-P1-021 / QA-001 UT-11-FE) — Tests unitarios del hook `useApplyBudgetSuggestion`.
// Cubre la invalidación de `['event', eventId, 'budget']` tras éxito y la clasificación de
// errores 409/400/422 para el UI.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/msw/server';
import { ApiError } from '@/shared/api-client';
import {
  useApplyBudgetSuggestion,
  classifyBudgetApplyError,
  extractInactiveCategories,
} from '@/features/ai/hitl';

const EV = 'ev-1';
const REC = '00000000-0000-4000-8000-000000000010';

function wrapWithClient(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('US-037 UT-11-FE — useApplyBudgetSuggestion', () => {
  afterEach(() => server.resetHandlers());

  it('invalida la queryKey ["event", eventId, "budget"] tras éxito', async () => {
    server.use(
      http.post(`*/api/v1/ai-recommendations/${REC}/apply`, () =>
        HttpResponse.json({
          data: {
            recommendationId: REC,
            type: 'budget_suggestion',
            status: 'accepted',
            eventId: EV,
            vendorProfileId: null,
            quoteRequestId: null,
            input: {},
            output: {},
            aiMeta: null,
            createdAt: '2026-06-27T00:00:00Z',
          },
          meta: { correlationId: 'c-1', timestamp: '2026-06-27T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(
      () => useApplyBudgetSuggestion({ aiRecommendationId: REC, eventId: EV }),
      { wrapper: wrapWithClient(qc) },
    );
    result.current.mutate({
      editedPayload: {
        currencyCode: 'GTQ',
        items: [{ category: 'venue', estimatedAmount: '5000.00' }],
      } as unknown as Record<string, unknown>,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['event', EV, 'budget'] });
  });

  it('classifyBudgetApplyError clasifica los códigos conocidos', () => {
    expect(
      classifyBudgetApplyError(new ApiError({ code: 'CATEGORY_INACTIVE', message: 'x', status: 409 })),
    ).toBe('CATEGORY_INACTIVE');
    expect(
      classifyBudgetApplyError(new ApiError({ code: 'EVENT_NOT_EDITABLE', message: 'x', status: 409 })),
    ).toBe('EVENT_NOT_EDITABLE');
    expect(
      classifyBudgetApplyError(new ApiError({ code: 'CURRENCY_MISMATCH', message: 'x', status: 409 })),
    ).toBe('CURRENCY_MISMATCH');
    expect(
      classifyBudgetApplyError(new ApiError({ code: 'PAYLOAD_INVALID', message: 'x', status: 422 })),
    ).toBe('PAYLOAD_INVALID');
    expect(classifyBudgetApplyError(new Error('other'))).toBe('UNKNOWN');
  });

  it('extractInactiveCategories parsea `<code>:<name>` de details[]', () => {
    const err = new ApiError({
      code: 'CATEGORY_INACTIVE',
      message: 'inactive',
      status: 409,
      details: [
        { field: 'inactive_categories', message: 'venue:Venue' },
        { field: 'inactive_categories', message: 'catering:Catering' },
        { field: 'other', message: 'ignored' },
      ],
    });
    const out = extractInactiveCategories(err);
    expect(out).toEqual([
      { code: 'venue', name: 'Venue' },
      { code: 'catering', name: 'Catering' },
    ]);
  });
});
