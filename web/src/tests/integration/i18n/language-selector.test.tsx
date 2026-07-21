// US-081 QA-002 — Integration tests del flujo de cambio de idioma end-to-end del cliente:
// 1) Authenticated (SessionProvider hidratado con `GET /users/me` real vía MSW): cambio persiste
//    en cookie + refresh + PATCH real → sin error.
// 2) Anónimo (SessionProvider con 401): cambio persiste cookie + refresh, sin PATCH.
// 3) Default: sin cookie previa y locale=es-LATAM (default), la UI se muestra en es-LATAM.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { LanguageSelector } from '@/shared/i18n';
import { SessionProvider } from '@/shared/auth-session/SessionProvider';
import { authenticatedMeHandler } from '@/tests/msw/handlers/profile';
import { server } from '@/tests/msw/server';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn() }),
}));

afterEach(() => {
  refresh.mockClear();
  document.cookie = 'eventflow_locale=; path=/; max-age=0';
});

function renderWithSession(locale = 'es-LATAM') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale={locale} messages={{ common: esLatamCommon }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <LanguageSelector />
        </SessionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe('US-081 IT — cambio de idioma end-to-end', () => {
  it('AC-01 authenticated: cambio dispara PATCH y persiste', async () => {
    let patchBody: unknown = null;
    server.use(
      authenticatedMeHandler,
      http.patch('*/api/v1/users/me/preferred-language', async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json(
          { data: { preferredLanguage: (patchBody as { preferredLanguage: string }).preferredLanguage }, meta: { correlationId: 'r' } },
          { status: 200 },
        );
      }),
    );

    const user = userEvent.setup();
    renderWithSession('es-LATAM');
    // Esperar a que SessionProvider hidrate (aunque no bloquea la UI, evitamos race con la
    // mutación que decide si dispara PATCH).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    await user.click(screen.getByRole('option', { name: /Português/ }));

    expect(document.cookie).toContain('eventflow_locale=pt');
    expect(refresh).toHaveBeenCalled();
    await waitFor(() =>
      expect((patchBody as { preferredLanguage?: string } | null)?.preferredLanguage).toBe('pt'),
    );
  });

  it('AC-02 anonymous: cambio NO dispara PATCH', async () => {
    let patchCalled = false;
    server.use(
      // 401 = anónimo (SessionProvider lo interpreta como no autenticado).
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'no session' }, meta: { correlationId: 'r' } },
          { status: 401 },
        ),
      ),
      http.patch('*/api/v1/users/me/preferred-language', () => {
        patchCalled = true;
        return HttpResponse.json({ data: {}, meta: { correlationId: 'r' } }, { status: 200 });
      }),
    );

    const user = userEvent.setup();
    renderWithSession('es-LATAM');
    // Espera un tick a que la query resuelva 401 → anónimo confirmado.
    await new Promise((r) => setTimeout(r, 20));

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    await user.click(screen.getByRole('option', { name: /English/ }));

    expect(document.cookie).toContain('eventflow_locale=en');
    expect(refresh).toHaveBeenCalled();
    // Esperar para descartar side-effects async.
    await new Promise((r) => setTimeout(r, 30));
    expect(patchCalled).toBe(false);
  });

  it('AC-04 default: locale es-LATAM se muestra sin cookie previa', () => {
    server.use(
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'no session' }, meta: { correlationId: 'r' } },
          { status: 401 },
        ),
      ),
    );
    renderWithSession('es-LATAM');
    // Sin cookie previa.
    expect(document.cookie).not.toContain('eventflow_locale=');
    // Label en es-LATAM.
    expect(screen.getByRole('button', { name: 'Cambiar idioma' })).toBeInTheDocument();
    // Locale actual mostrado.
    expect(screen.getByTestId('language-selector-current')).toHaveTextContent('es-LATAM');
  });
});
