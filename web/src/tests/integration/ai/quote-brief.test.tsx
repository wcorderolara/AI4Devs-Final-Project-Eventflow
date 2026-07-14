// US-021 — feature AI Quote Brief: generación, precarga editable, error banners y descarte.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { AIBriefAutocomplete } from '@/features/ai/quote-brief';
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

describe('US-021 — AI Quote Brief', () => {
  it('AC-01/AC-02 happy path: precarga editable con badge IA por sección', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIBriefAutocomplete eventId={EVENT_ID} />);

    // Ingresa categoría objetivo y dispara autocompletado.
    const catInput = await screen.findByTestId('ai-brief-category-input');
    await user.type(catInput, 'catering');
    await user.click(screen.getByTestId('ai-brief-generate-cta'));

    await waitFor(() =>
      expect(screen.getByTestId('ai-quote-brief-viewer')).toBeInTheDocument(),
    );

    // Cada campo del brief está renderizado y es editable.
    expect(screen.getByTestId('ai-brief-field-brief')).toBeInTheDocument();
    expect(screen.getByTestId('ai-brief-field-requirements')).toBeInTheDocument();
    expect(screen.getByTestId('ai-brief-field-questions')).toBeInTheDocument();
    expect(screen.getByTestId('ai-brief-field-constraints')).toBeInTheDocument();

    // Badge "Sugerido por IA" por cada sección.
    expect(screen.getAllByTestId('ai-brief-badge').length).toBeGreaterThanOrEqual(4);

    // La textarea del brief está pre-poblada con el contenido del Mock.
    const brief = screen.getByTestId('ai-brief-field-brief') as HTMLTextAreaElement;
    expect(brief.value).toMatch(/celebración privada|servicio profesional/i);

    // Edición manual: se refleja en la textarea.
    await user.clear(brief);
    await user.type(brief, 'Brief editado por el organizador.');
    expect(brief.value).toBe('Brief editado por el organizador.');
  });

  it('EC-01: descartar limpia el brief y oculta el viewer', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIBriefAutocomplete eventId={EVENT_ID} />);

    await user.type(await screen.findByTestId('ai-brief-category-input'), 'catering');
    await user.click(screen.getByTestId('ai-brief-generate-cta'));
    await waitFor(() =>
      expect(screen.getByTestId('ai-quote-brief-viewer')).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('ai-brief-discard'));

    // El viewer desaparece y el brief queda vacío (handoff a US-025 gestiona `status='discarded'`).
    await waitFor(() =>
      expect(screen.queryByTestId('ai-quote-brief-viewer')).not.toBeInTheDocument(),
    );
  });

  it('EC-07: 429 RATE_LIMITED → banner de error localizado', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/quote-brief', () =>
        HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'AI limit reached',
              correlationId: 'req_test_qb_429',
            },
          },
          { status: 429, headers: { 'Retry-After': '30' } },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIBriefAutocomplete eventId={EVENT_ID} />);
    await user.type(await screen.findByTestId('ai-brief-category-input'), 'catering');
    await user.click(screen.getByTestId('ai-brief-generate-cta'));

    const err = await screen.findByTestId('ai-quote-brief-error');
    expect(err.textContent).toMatch(/límite de uso de ia/i);
  });

  it('EC-05/EC-06: 5xx AI_INVALID_OUTPUT → banner con reintentar', async () => {
    server.use(
      http.post('*/api/v1/events/:eventId/ai/quote-brief', () =>
        HttpResponse.json(
          {
            error: {
              code: 'AI_INVALID_OUTPUT',
              message: 'invalid output',
              correlationId: 'req_test_qb_5xx',
            },
          },
          { status: 502 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<AIBriefAutocomplete eventId={EVENT_ID} />);
    await user.type(await screen.findByTestId('ai-brief-category-input'), 'catering');
    await user.click(screen.getByTestId('ai-brief-generate-cta'));

    const err = await screen.findByTestId('ai-quote-brief-error');
    expect(err.textContent).toMatch(/respuesta inesperada/i);
  });
});
