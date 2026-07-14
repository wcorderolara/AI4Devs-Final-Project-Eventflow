// US-018 — feature AI checklist: generación, agrupación por fase T-x y estados.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AIChecklistGenerator } from '@/features/ai/checklist';
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

describe('US-018 — AI Checklist Generator', () => {
  it('AC-01 happy path: genera y muestra el checklist agrupado por fase T-x', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIChecklistGenerator eventId={EVENT_ID} />);

    const cta = await screen.findByRole('button', { name: /generar checklist ia/i });
    await user.click(cta);

    await waitFor(() =>
      expect(screen.getByTestId('ai-checklist-viewer')).toBeInTheDocument(),
    );

    // AC-04: cada fase renderizada como region con aria-labelledby
    expect(screen.getByTestId('ai-checklist-phase-T-180')).toHaveAttribute('role', 'region');
    expect(screen.getByTestId('ai-checklist-phase-T-1')).toHaveAttribute('role', 'region');

    // Contenido esperado del fixture
    expect(screen.getByText('Definir la fecha y el lugar')).toBeInTheDocument();
    expect(screen.getByText('Enviar invitaciones')).toBeInTheDocument();
  });

  it('EC-05: 429 RATE_LIMITED → banner de error localizado', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/checklist', () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'AI limit reached', correlationId: 'req_test_checklist_429' } },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIChecklistGenerator eventId={EVENT_ID} />);
    await user.click(await screen.findByRole('button', { name: /generar checklist ia/i }));

    const err = await screen.findByTestId('ai-checklist-error');
    expect(err.textContent).toMatch(/límite de uso de ia/i);
  });
});
