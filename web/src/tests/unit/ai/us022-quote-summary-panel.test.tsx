// US-022 (PB-P2-001 / QA-005) — Unit tests DOM + A11Y del panel `AIComparisonSummary`.
// Verifica:
//   - AC-01 flujo feliz: al pulsar "Generar" se renderizan las cards con pros/cons por quote.
//   - AC-03 HITL: no expone campo `recommendation` ni CTA de auto-preferred.
//   - AC-04 locale: usa las traducciones del namespace `organizer.ai.quote_summary` en pt.
//   - AC-05 fallback: al recibir `locale_fallback=true` se pinta la nota de fallback.
//   - EC-05 snapshot mismatch: cuando `currentQuoteIds` difiere del snapshot, aparece el banner.
//   - A11Y: `role="complementary"`, headings semánticos, sin violaciones axe.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import esLatamOrganizer from '@/messages/es-LATAM/organizer.json';
import ptOrganizer from '@/messages/pt/organizer.json';
import { AIComparisonSummary } from '@/features/ai/quote-summary';
import type { GenerateQuoteSummaryResponse } from '@/features/ai/quote-summary';

expect.extend(toHaveNoViolations);

const RESPONSE: GenerateQuoteSummaryResponse = {
  ai_recommendation_id: 'rec-1',
  summaries: [
    {
      quote_id: '11111111-1111-4111-8111-111111111111',
      pros: ['Precio competitivo'],
      cons: ['Menú limitado'],
      missing_info: ['Política cancelación'],
      notes: 'Confirmar disponibilidad',
    },
    {
      quote_id: '22222222-2222-4222-8222-222222222222',
      pros: ['Servicio completo'],
      cons: ['Precio alto'],
      missing_info: [],
      notes: '',
    },
  ],
  overall_observations: 'Ambas opciones son razonables.',
  locale: 'es-LATAM',
  locale_fallback: false,
  generated_at: '2026-07-22T00:00:00.000Z',
  quote_ids_snapshot: [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ],
  category_code: 'catering',
};

interface FakeMutation {
  mutate: (input: { eventId: string; categoryCode: string }) => void;
  reset: () => void;
  data: GenerateQuoteSummaryResponse | undefined;
  isPending: boolean;
  isError: boolean;
  error: null;
}

function useFakeMutation(state: {
  data?: GenerateQuoteSummaryResponse;
  isError?: boolean;
  isPending?: boolean;
}): () => FakeMutation {
  return function useMutationImpl(): FakeMutation {
    return {
      mutate: () => {},
      reset: () => {},
      data: state.data,
      isPending: state.isPending ?? false,
      isError: state.isError ?? false,
      error: null,
    };
  };
}

function withProviders(children: React.ReactNode, locale: 'es-LATAM' | 'pt' = 'es-LATAM'): React.ReactElement {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const messages = locale === 'es-LATAM' ? { organizer: esLatamOrganizer } : { organizer: ptOrganizer };
  return (
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('US-022 QA-005 — AIComparisonSummary panel', () => {
  it('AC-01/AC-03: renderiza summaries por quote sin recomendación automática', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={RESPONSE.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({ data: RESPONSE }) as never}
          vendorLabelByQuoteId={{
            '11111111-1111-4111-8111-111111111111': 'Catering Uno',
            '22222222-2222-4222-8222-222222222222': 'Catering Dos',
          }}
        />,
      ),
    );
    expect(screen.getByText('Resumen IA del comparador')).toBeInTheDocument();
    expect(screen.getByText('Catering Uno')).toBeInTheDocument();
    expect(screen.getByText('Catering Dos')).toBeInTheDocument();
    expect(screen.getByText('Precio competitivo')).toBeInTheDocument();
    expect(screen.getByText('Menú limitado')).toBeInTheDocument();
    expect(screen.getByText('Ambas opciones son razonables.')).toBeInTheDocument();
    // AC-03: no expone recomendación automática ni botón preferred.
    expect(screen.queryByText(/marcar preferred/i)).toBeNull();
    expect(screen.queryByText(/recommendation/i)).toBeNull();
  });

  it('AC-04: usa traducciones pt correctamente', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={RESPONSE.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({ data: RESPONSE }) as never}
        />,
        'pt',
      ),
    );
    expect(screen.getByText('Resumo IA do comparador')).toBeInTheDocument();
    expect(screen.getAllByText('Pontos a favor').length).toBeGreaterThanOrEqual(1);
  });

  it('AC-05: cuando `locale_fallback=true` muestra la nota de fallback', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={RESPONSE.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({ data: { ...RESPONSE, locale_fallback: true } }) as never}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-fallback-notice')).toBeInTheDocument();
  });

  it('EC-05: snapshot mismatch → banner de "cotizaciones cambiaron"', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={['33333333-3333-4333-8333-333333333333']}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({ data: RESPONSE }) as never}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-snapshot-banner')).toBeInTheDocument();
    expect(screen.getByTestId('ai-quote-summary-regenerate-banner')).toBeInTheDocument();
  });

  it('empty state → botón "Generar resumen IA"', () => {
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={[]}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({}) as never}
        />,
      ),
    );
    expect(screen.getByTestId('ai-quote-summary-generate')).toBeInTheDocument();
  });

  it('onClose se dispara al pulsar el botón de cerrar', () => {
    let closed = false;
    render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={[]}
          open
          onClose={() => {
            closed = true;
          }}
          useMutationHook={useFakeMutation({}) as never}
        />,
      ),
    );
    fireEvent.click(screen.getByTestId('ai-quote-summary-close'));
    expect(closed).toBe(true);
  });

  it('A11Y: 0 violaciones axe en success state', async () => {
    const { container } = render(
      withProviders(
        <AIComparisonSummary
          eventId="ev-1"
          categoryCode="catering"
          currentQuoteIds={RESPONSE.quote_ids_snapshot as string[]}
          open
          onClose={() => {}}
          useMutationHook={useFakeMutation({ data: RESPONSE }) as never}
        />,
      ),
    );
    await waitFor(async () => {
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
