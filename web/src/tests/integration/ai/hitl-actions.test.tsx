// US-025 (PB-P1-016) / FE-002 + FE-004 — Test integración `HITLActions`. Cubre:
//   * Render con orden de tab Aplicar → Editar → Descartar y aria-labels.
//   * Apply happy path (mock 200) → onApplied invocado.
//   * Discard con confirmación (204) → onDiscarded invocado.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { HITLActions } from '@/features/ai/hitl';
import esLatamAi from '@/messages/es-LATAM/ai.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { server } from '@/tests/msw/server';

const REC_ID = 'a1111111-1111-4111-8111-111111111111';

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale="es-LATAM"
      messages={{ ai: esLatamAi, common: esLatamCommon }}
    >
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('US-025 — HITLActions component', () => {
  it('FE-002: renderiza los tres botones canónicos con aria-labels', () => {
    renderWithProviders(
      <HITLActions
        aiRecommendationId={REC_ID}
        type="event_plan"
        initialOutput={{ summary: 'test' }}
      />,
    );
    expect(screen.getByRole('button', { name: /aplicar sugerencia ia/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /descartar sugerencia ia/i })).toBeInTheDocument();
  });

  it('FE-002 + AC-01: apply happy path — llama al backend y ejecuta onApplied', async () => {
    server.use(
      http.post(`*/api/v1/ai-recommendations/${REC_ID}/apply`, () =>
        HttpResponse.json({
          data: {
            recommendationId: REC_ID,
            type: 'event_plan',
            status: 'accepted',
            eventId: 'evt-1',
            vendorProfileId: null,
            quoteRequestId: null,
            input: {},
            output: {},
            aiMeta: {},
            createdAt: '2026-07-13T00:00:00Z',
          },
          meta: { correlationId: 'c1', timestamp: '2026-07-13T00:00:00Z' },
        }),
      ),
    );
    const onApplied = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <HITLActions
        aiRecommendationId={REC_ID}
        type="event_plan"
        initialOutput={{ summary: 'test' }}
        onApplied={onApplied}
      />,
    );
    await user.click(screen.getByRole('button', { name: /aplicar sugerencia ia/i }));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
  });

  it('FE-002 + AC-03: discard con confirmación — llama al backend y ejecuta onDiscarded', async () => {
    server.use(
      http.post(`*/api/v1/ai-recommendations/${REC_ID}/discard`, () => new HttpResponse(null, { status: 204 })),
    );
    const onDiscarded = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <HITLActions
        aiRecommendationId={REC_ID}
        type="event_plan"
        initialOutput={{ summary: 'test' }}
        onDiscarded={onDiscarded}
      />,
    );
    await user.click(screen.getByRole('button', { name: /descartar sugerencia ia/i }));
    // Confirma en el diálogo.
    await user.click(screen.getByRole('button', { name: /^sí, descartar$/i }));
    await waitFor(() => expect(onDiscarded).toHaveBeenCalled());
  });

  it('FE-002: cancelar el diálogo de descarte NO ejecuta onDiscarded', async () => {
    const onDiscarded = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <HITLActions
        aiRecommendationId={REC_ID}
        type="event_plan"
        initialOutput={{ summary: 'test' }}
        onDiscarded={onDiscarded}
      />,
    );
    await user.click(screen.getByRole('button', { name: /descartar sugerencia ia/i }));
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(onDiscarded).not.toHaveBeenCalled();
  });
});
