// US-005 / FE-001..003 + QA-003/QA-004 — useLogout + UserMenu: 204 y 401 tratados igual
// (limpieza + redirect a /login), purga de queries de sesión (AC-02) y accesibilidad del item.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useLogout } from '@/shared/auth-session';
import { UserMenu } from '@/shared/navigation';
import esLatamNavigation from '@/messages/es-LATAM/navigation.json';
import { usersMeEnvelope } from '@/tests/msw/handlers/auth';
import { server } from '@/tests/msw/server';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}));

afterEach(() => {
  replace.mockClear();
});

function LogoutProbe() {
  const logout = useLogout();
  return (
    <button type="button" onClick={() => logout.mutate()}>
      probe-logout
    </button>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(['me'], {
    user: { id: 'u1', email: 'ana@eventflow.test', displayName: 'Ana Pérez' },
    role: 'organizer',
    locale: 'es-LATAM',
  });
  queryClient.setQueryData(['auth', 'x'], { any: true });
  queryClient.setQueryData(['events'], { keep: true });
  const utils = render(
    <NextIntlClientProvider locale="es-LATAM" messages={{ navigation: esLatamNavigation }}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { queryClient, ...utils };
}

describe('US-005 FE-001 — useLogout', () => {
  it('AC-01/AC-02: 204 → purga queries de sesión/auth (conserva otras) y redirige a /login', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<LogoutProbe />);
    await user.click(screen.getByRole('button', { name: 'probe-logout' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(queryClient.getQueryData(['auth', 'x'])).toBeUndefined();
    expect(queryClient.getQueryData(['events'])).toEqual({ keep: true });
  });

  it('EC-01: 401 se trata igual que 204 (limpieza + redirect)', async () => {
    server.use(
      http.post('*/api/v1/auth/logout', () =>
        HttpResponse.json(
          { error: { code: 'AUTHENTICATION_REQUIRED', message: 'No session' }, meta: { correlationId: 'r' } },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { queryClient } = renderWithProviders(<LogoutProbe />);
    await user.click(screen.getByRole('button', { name: 'probe-logout' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
  });

  it('error de red (500) → NO redirige (permanece en la página; D2)', async () => {
    server.use(
      http.post('*/api/v1/auth/logout', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'boom' }, meta: { correlationId: 'r' } },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LogoutProbe />);
    await user.click(screen.getByRole('button', { name: 'probe-logout' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('US-005 FE-002/FE-003 — UserMenu integra el logout real', () => {
  it('click en "Cerrar sesión" → POST /auth/logout y redirección (sin modal — Decisión PO #4)', async () => {
    server.use(http.get('*/api/v1/users/me', () => HttpResponse.json(usersMeEnvelope, { status: 200 })));
    let logoutCalled = false;
    server.use(
      http.post('*/api/v1/auth/logout', () => {
        logoutCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(
      // SessionProvider real no es necesario: UserMenu consume useSession vía contexto default…
      // pero el default es anónimo → montamos con el contexto real usando el provider.
      <UserMenuHarness />,
    );

    const trigger = await screen.findByRole('button', { name: /Ana Pérez/ });
    await user.click(trigger);
    const item = await screen.findByRole('menuitem', { name: 'Cerrar sesión' });
    await user.click(item);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(logoutCalled).toBe(true);
  });
});

// Harness: SessionProvider real hidratado por MSW (usersMeEnvelope 200).
function UserMenuHarness() {
  return (
    <SessionProvider>
      <UserMenu />
    </SessionProvider>
  );
}
