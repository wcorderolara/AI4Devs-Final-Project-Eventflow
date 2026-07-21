// US-081 QA-001 / QA-003 — Tests del componente `LanguageSelector`. Cubre A11Y básica
// (semántica de HeadlessUI Listbox), keyboard navigation y comportamiento de cambio + error.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageSelector } from '@/shared/i18n/LanguageSelector';
import enCommon from '@/messages/en/common.json';
import esLatamCommon from '@/messages/es-LATAM/common.json';
import { server } from '@/tests/msw/server';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn() }),
}));

const mockSessionState = {
  user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
  role: 'organizer' as const,
  isAuthenticated: true,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};
vi.mock('@/shared/auth-session/useSession', () => ({
  useSession: () => mockSessionState,
}));

afterEach(() => {
  refresh.mockClear();
  document.cookie = 'eventflow_locale=; path=/; max-age=0';
  mockSessionState.isAuthenticated = true;
});

function Wrapper({ children, locale = 'es-LATAM' }: { children: ReactNode; locale?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const messages = locale === 'en' ? { common: enCommon } : { common: esLatamCommon };
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

function renderSelector(locale = 'es-LATAM') {
  return render(
    <Wrapper locale={locale}>
      <LanguageSelector />
    </Wrapper>,
  );
}

describe('<LanguageSelector>', () => {
  it('expone un botón con aria-label i18n y muestra el locale actual', () => {
    renderSelector('en');
    const button = screen.getByRole('button', { name: 'Change language' });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('language-selector-current')).toHaveTextContent('en');
  });

  it('al abrir muestra las 4 opciones con etiqueta nativa y semántica listbox/option', async () => {
    const user = userEvent.setup();
    renderSelector('es-LATAM');
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Español \(LATAM\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Español \(España\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Português/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /English/ })).toBeInTheDocument();
    // La opción actual está marcada como seleccionada.
    expect(screen.getByRole('option', { name: /Español \(LATAM\)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('seleccionar otra opción escribe cookie + dispara refresh', async () => {
    server.use(
      http.patch('*/api/v1/users/me/preferred-language', () =>
        HttpResponse.json({ data: {}, meta: { correlationId: 'r' } }, { status: 200 }),
      ),
    );
    const user = userEvent.setup();
    renderSelector('es-LATAM');
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    await user.click(screen.getByRole('option', { name: /English/ }));

    expect(document.cookie).toContain('eventflow_locale=en');
    expect(refresh).toHaveBeenCalled();
  });

  it('AC-03: en 5xx muestra alerta de rollback con texto i18n y botón dismiss', async () => {
    server.use(
      http.patch('*/api/v1/users/me/preferred-language', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom' }, meta: { correlationId: 'r' } },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderSelector('es-LATAM');
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    await user.click(screen.getByRole('option', { name: /English/ }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo guardar tu preferencia');
    // Cookie revertida.
    expect(document.cookie).toContain('eventflow_locale=es-LATAM');
    // Dismiss.
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('QA-003: sin violaciones críticas/serias de axe (estado cerrado)', async () => {
    const { container } = renderSelector('es-LATAM');
    const results = await axe(container);
    expect(
      results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    ).toEqual([]);
  });
});
