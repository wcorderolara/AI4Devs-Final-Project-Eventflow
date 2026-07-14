// US-017 — feature AI event plan: generación, estados y a11y del generador.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AIPlanGenerator } from '@/features/ai/event-plan';
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

describe('US-017 — AI Plan Generator', () => {
  it('AC-01 happy path: genera y muestra el plan sugerido con badge', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIPlanGenerator eventId={EVENT_ID} />);

    // Espera el estado empty
    const cta = await screen.findByRole('button', { name: /generar plan ia/i });
    await user.click(cta);

    // Espera el viewer con la sugerencia
    await waitFor(() =>
      expect(screen.getByTestId('ai-suggestion-viewer')).toBeInTheDocument(),
    );

    // Badge "Sugerido por IA" y region con role="region"
    expect(screen.getAllByText(/sugerido por ia/i).length).toBeGreaterThan(0);
    const viewer = screen.getByTestId('ai-suggestion-viewer');
    expect(viewer).toHaveAttribute('role', 'region');
    expect(viewer).toHaveAttribute('aria-live', 'polite');
    // Contenido del plan visible
    expect(screen.getByText('Plan sugerido para el evento')).toBeInTheDocument();
    expect(screen.getByText('Preparación')).toBeInTheDocument();
  });

  it('EC-04: 429 RATE_LIMITED → banner de error retryable', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/event-plan', () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'AI limit reached', correlationId: 'req_test_ai_429' } },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIPlanGenerator eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /generar plan ia/i }));

    const err = await screen.findByTestId('ai-plan-error');
    expect(err).toBeInTheDocument();
    expect(err.textContent).toMatch(/límite de uso de ia/i);
  });

  it('EC-01: AI_TIMEOUT → mensaje de timeout localizado', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/event-plan', () =>
        HttpResponse.json(
          { error: { code: 'AI_TIMEOUT', message: 'timeout', correlationId: 'req_test_ai_timeout' } },
          { status: 504 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIPlanGenerator eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /generar plan ia/i }));

    const err = await screen.findByTestId('ai-plan-error');
    expect(err.textContent).toMatch(/tardó demasiado/i);
  });
});
