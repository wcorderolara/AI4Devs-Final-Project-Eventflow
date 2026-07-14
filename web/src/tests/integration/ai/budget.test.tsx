// US-019 — feature AI Budget Suggestion: generación, tabla accesible con distribución y errores.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AIBudgetSuggestion } from '@/features/ai/budget-suggestion';
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

describe('US-019 — AI Budget Suggestion', () => {
  it('AC-01/AC-04 happy path: genera y muestra la tabla de distribución con categorías', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIBudgetSuggestion eventId={EVENT_ID} />);

    const cta = await screen.findByRole('button', { name: /sugerir distribución ia/i });
    await user.click(cta);

    await waitFor(() =>
      expect(screen.getByTestId('ai-budget-viewer')).toBeInTheDocument(),
    );

    // Tabla accesible con headers de columna.
    const table = screen.getByTestId('ai-budget-table');
    expect(table.tagName).toBe('TABLE');
    expect(table.querySelector('caption')).not.toBeNull();
    const headers = table.querySelectorAll('th[scope="col"]');
    expect(headers.length).toBeGreaterThanOrEqual(4);

    // Contenido esperado del fixture (categorías canónicas).
    expect(screen.getByText('Banquetes y Catering')).toBeInTheDocument();
    expect(screen.getByText('Fotografía')).toBeInTheDocument();

    // Barras con role="progressbar" y aria-valuenow.
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBeGreaterThanOrEqual(1);
    expect(bars[0]).toHaveAttribute('aria-valuenow');
  });

  it('EC-06: 429 RATE_LIMITED → banner de error localizado', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/budget-suggestion', () =>
        HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'AI limit reached',
              correlationId: 'req_test_budget_429',
            },
          },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIBudgetSuggestion eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /sugerir distribución ia/i }));

    const err = await screen.findByTestId('ai-budget-error');
    expect(err.textContent).toMatch(/límite de uso de ia/i);
  });

  it('EC-01: 400 INVALID_BUDGET → mensaje específico de presupuesto', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/budget-suggestion', () =>
        HttpResponse.json(
          {
            error: {
              code: 'INVALID_BUDGET',
              message: 'budget_estimated must be greater than 0',
              correlationId: 'req_test_budget_400',
            },
          },
          { status: 400 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIBudgetSuggestion eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /sugerir distribución ia/i }));

    const err = await screen.findByTestId('ai-budget-error');
    expect(err.textContent).toMatch(/presupuesto estimado/i);
  });
});
