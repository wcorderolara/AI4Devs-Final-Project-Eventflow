// US-059 (PB-P2-001 / QA-001 + QA-004) — Unit tests del hook `useLatestQuoteSummary` y de los
// nuevos estados del panel `AIComparisonSummary` (empty persistido, initialData).
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/msw/server';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import {
  useLatestQuoteSummary,
  computeQuoteIdsMismatch,
  AIComparisonSummary,
  type GenerateQuoteSummaryResponse,
} from '@/features/ai/quote-summary';

const EV = 'ev-1';
const CAT = 'catering';

const PERSISTED: GenerateQuoteSummaryResponse = {
  ai_recommendation_id: 'rec-persisted',
  summaries: [
    {
      quote_id: '11111111-1111-4111-8111-111111111111',
      pros: ['Precio bueno'],
      cons: [],
      missing_info: [],
      notes: '',
    },
    {
      quote_id: '22222222-2222-4222-8222-222222222222',
      pros: [],
      cons: ['Fecha ajustada'],
      missing_info: [],
      notes: '',
    },
  ],
  overall_observations: undefined,
  locale: 'es-LATAM',
  locale_fallback: false,
  generated_at: '2026-07-22T00:00:00.000Z',
  quote_ids_snapshot: [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ],
  category_code: CAT,
};

function wrapWithClient(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function withProviders(children: React.ReactNode): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider
        locale="es-LATAM"
        messages={{ organizer: esLatamOrganizer }}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-059 QA-001 — computeQuoteIdsMismatch', () => {
  it('devuelve false cuando ambos sets son iguales (orden distinto)', () => {
    expect(computeQuoteIdsMismatch(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(false);
  });

  it('detecta quote nueva añadida en current', () => {
    expect(computeQuoteIdsMismatch(['a', 'b'], ['a', 'b', 'c'])).toBe(true);
  });

  it('detecta quote removida en current', () => {
    expect(computeQuoteIdsMismatch(['a', 'b', 'c'], ['a', 'b'])).toBe(true);
  });

  it('detecta quote sustituida en current', () => {
    expect(computeQuoteIdsMismatch(['a', 'b'], ['a', 'z'])).toBe(true);
  });

  it('sets vacíos → false', () => {
    expect(computeQuoteIdsMismatch([], [])).toBe(false);
  });
});

describe('US-059 QA-001 — useLatestQuoteSummary', () => {
  afterEach(() => server.resetHandlers());

  it('AC-01: retorna data + exists=true + isStale=false cuando snapshot coincide', async () => {
    server.use(
      http.get(`*/api/v1/events/${EV}/ai/quote-summary`, () =>
        HttpResponse.json({
          data: PERSISTED,
          meta: { correlationId: 'c', timestamp: '2026-07-22T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useLatestQuoteSummary({
          eventId: EV,
          categoryCode: CAT,
          currentQuoteIds: PERSISTED.quote_ids_snapshot,
        }),
      { wrapper: wrapWithClient(qc) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ai_recommendation_id).toBe('rec-persisted');
    expect(result.current.exists).toBe(true);
    expect(result.current.notFound).toBe(false);
    expect(result.current.isStale).toBe(false);
  });

  it('AC-03: isStale=true cuando el snapshot difiere de currentQuoteIds', async () => {
    server.use(
      http.get(`*/api/v1/events/${EV}/ai/quote-summary`, () =>
        HttpResponse.json({
          data: PERSISTED,
          meta: { correlationId: 'c', timestamp: '2026-07-22T00:00:00Z' },
        }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useLatestQuoteSummary({
          eventId: EV,
          categoryCode: CAT,
          currentQuoteIds: ['33333333-3333-4333-8333-333333333333'],
        }),
      { wrapper: wrapWithClient(qc) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isStale).toBe(true);
  });

  it('AC-02: notFound=true cuando el backend responde 404 (empty state)', async () => {
    server.use(
      http.get(`*/api/v1/events/${EV}/ai/quote-summary`, () =>
        HttpResponse.json(
          { error: { code: 'RESOURCE_NOT_FOUND', message: 'not found' } },
          { status: 404 },
        ),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useLatestQuoteSummary({
          eventId: EV,
          categoryCode: CAT,
          currentQuoteIds: [],
        }),
      { wrapper: wrapWithClient(qc) },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.notFound).toBe(true);
    expect(result.current.exists).toBe(false);
    expect(result.current.isStale).toBe(false);
  });

  it('enabled=false → no dispara request y notFound=false', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () =>
        useLatestQuoteSummary({
          eventId: EV,
          categoryCode: CAT,
          currentQuoteIds: [],
          enabled: false,
        }),
      { wrapper: wrapWithClient(qc) },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.notFound).toBe(false);
  });
});

const noopMutationHook = (): {
  mutate: (input: { eventId: string; categoryCode: string }) => void;
  reset: () => void;
  data: undefined;
  isPending: boolean;
  isError: boolean;
  error: null;
} => ({
  mutate: () => {},
  reset: () => {},
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
});

describe('US-059 QA-004 — AIComparisonSummary extendido con initialData/initialNotFound/initialLoading', () => {
  it('AC-01: cuando `initialData` está presente, el panel renderiza el resumen persistido sin mutation', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId={EV}
          categoryCode={CAT}
          currentQuoteIds={PERSISTED.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={noopMutationHook as never}
          initialData={PERSISTED}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-panel')).toBeInTheDocument();
    expect(screen.getByText('Precio bueno')).toBeInTheDocument();
  });

  it('AC-02 · empty persistido: `initialNotFound=true` muestra el prompt específico + CTA', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId={EV}
          categoryCode={CAT}
          currentQuoteIds={PERSISTED.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={noopMutationHook as never}
          initialNotFound
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-empty-persisted')).toBeInTheDocument();
    expect(screen.getByTestId('ai-quote-summary-generate')).toBeInTheDocument();
  });

  it('loading: `initialLoading=true` muestra skeleton (sin data ni error)', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId={EV}
          categoryCode={CAT}
          currentQuoteIds={[]}
          open
          onClose={() => {}}
          useMutationHook={noopMutationHook as never}
          initialLoading
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-loading')).toBeInTheDocument();
  });

  it('AC-03 stale con initialData: banner visible cuando currentQuoteIds difieren del snapshot', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId={EV}
          categoryCode={CAT}
          currentQuoteIds={['99999999-9999-4999-8999-999999999999']}
          open
          onClose={() => {}}
          useMutationHook={noopMutationHook as never}
          initialData={PERSISTED}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-snapshot-banner')).toBeInTheDocument();
  });

  it('AC-04 fallback con initialData: banner de fallback visible cuando `locale_fallback=true`', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId={EV}
          categoryCode={CAT}
          currentQuoteIds={PERSISTED.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={noopMutationHook as never}
          initialData={{ ...PERSISTED, locale_fallback: true }}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-fallback-notice')).toBeInTheDocument();
  });
});
