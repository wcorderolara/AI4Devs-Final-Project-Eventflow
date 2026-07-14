// US-020 — feature AI Vendor Categories: generación, lista accesible y click-through.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AIRecommendedCategories } from '@/features/ai/vendor-categories';
import esLatamAi from '@/messages/es-LATAM/ai.json';
import esLatamEvents from '@/messages/es-LATAM/events.json';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import { server } from '@/tests/msw/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale="es-LATAM"
      messages={{ ai: esLatamAi, events: esLatamEvents, navigation: esLatamNavigation }}
    >
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const EVENT_ID = 'e1111111-1111-4111-8111-111111111111';

describe('US-020 — AI Vendor Categories', () => {
  it('AC-01/AC-04 happy path: genera la lista priorizada y expone click-through al directorio', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIRecommendedCategories eventId={EVENT_ID} />);

    const cta = await screen.findByRole('button', { name: /generar recomendaciones ia/i });
    await user.click(cta);

    await waitFor(() =>
      expect(screen.getByTestId('ai-vendor-categories-viewer')).toBeInTheDocument(),
    );

    // Lista accesible con role="list".
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    // El fixture contiene 6 categorías; deben renderizarse todas.
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(6);

    // Cada tarjeta es un link al directorio con el query `category=<code>`.
    const venueLink = screen.getByTestId('ai-vendor-category-venue');
    expect(venueLink.tagName).toBe('A');
    expect(venueLink.getAttribute('href')).toContain('category=venue');
    expect(venueLink.getAttribute('aria-label')).toMatch(/salón y locación/i);
  });

  it('EC-05: 429 RATE_LIMITED → banner de error localizado', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/vendor-categories', () =>
        HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'AI limit reached',
              correlationId: 'req_test_vc_429',
            },
          },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIRecommendedCategories eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /generar recomendaciones ia/i }));

    const err = await screen.findByTestId('ai-vendor-categories-error');
    expect(err.textContent).toMatch(/límite de uso de ia/i);
  });

  it('EC-01/EC-02: 5xx AI_INVALID_OUTPUT → banner con reintentar', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/vendor-categories', () =>
        HttpResponse.json(
          {
            error: {
              code: 'AI_INVALID_OUTPUT',
              message: 'invalid output',
              correlationId: 'req_test_vc_5xx',
            },
          },
          { status: 502 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIRecommendedCategories eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /generar recomendaciones ia/i }));

    const err = await screen.findByTestId('ai-vendor-categories-error');
    expect(err.textContent).toMatch(/respuesta inesperada/i);
  });
});
