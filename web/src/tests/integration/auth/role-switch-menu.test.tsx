// Repro: admin → logout → login como organizer en la MISMA sesión de browser.
// El menú debe reflejar el rol recién autenticado (organizer), nunca el del admin previo.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider, useLogout } from '@/shared/auth-session';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { AuthenticatedShell } from '@/shared/navigation';
import navigationEs from '@/messages/es-LATAM/navigation.json';
import commonEs from '@/messages/es-LATAM/common.json';
import { server } from '@/tests/msw/server';

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/organizer',
  useRouter: () => ({ push, replace, prefetch: vi.fn(), refresh }),
}));

const meBase = {
  id: '3f2c1a4e-9b7d-4e2a-8c5f-1d0e6a7b8c9d',
  email: 'ana@eventflow.test',
  name: 'Ana Pérez',
  status: 'active',
  preferredLanguage: 'es-LATAM',
  phone: null,
  createdAt: '2026-07-10T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
};

let meRole: 'admin' | 'organizer' | null = 'admin';

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  refresh.mockClear();
  meRole = 'admin';
  server.use(
    http.get('*/api/v1/users/me', () => {
      if (!meRole) {
        return HttpResponse.json(
          { error: { code: 'AUTHENTICATION_REQUIRED', message: 'No session' }, meta: { correlationId: 'r' } },
          { status: 401 },
        );
      }
      return HttpResponse.json(
        { data: { ...meBase, role: meRole }, meta: { correlationId: 'r', timestamp: meBase.createdAt } },
        { status: 200 },
      );
    }),
    http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
    http.post('*/api/v1/auth/login', () =>
      HttpResponse.json(
        { data: { ...meBase, role: 'organizer' }, meta: { correlationId: 'r', timestamp: meBase.createdAt } },
        { status: 200 },
      ),
    ),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

function Flow() {
  const login = useLogin();
  const logout = useLogout();
  return (
    <SessionProvider>
      <AuthenticatedShell initialRole="admin">
        <button type="button" onClick={() => logout.mutate()}>
          do-logout
        </button>
        <button type="button" onClick={() => login.mutate({ email: 'org@x.test', password: 'Secret123!' })}>
          do-login
        </button>
      </AuthenticatedShell>
    </SessionProvider>
  );
}

describe('repro — cambio de rol admin→organizer en la misma sesión', () => {
  it('tras logout + login como organizer el menú es de organizer (no de admin)', async () => {
    // Un único QueryClient para todo el flujo (como en producción — instancia estable).
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="es-LATAM" messages={{ navigation: navigationEs, common: commonEs }}>
          <Flow />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    // 1) Sesión de admin hidratada → menú de administración.
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Navegación de administración' })).toBeInTheDocument(),
    );

    // 2) Logout (la sesión del backend queda revocada). Debe refrescar los Server Components para
    //    que ningún layout cacheado conserve el rol admin en la cookie `eventflow_role`.
    meRole = null;
    await user.click(screen.getByRole('button', { name: 'do-logout' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(refresh).toHaveBeenCalled();

    // 3) Login como organizer en la misma sesión de browser.
    meRole = 'organizer';
    refresh.mockClear();
    await user.click(screen.getByRole('button', { name: 'do-login' }));

    // 4) El menú debe ser el de organizer; el de admin no debe seguir presente. Y el login debe
    //    refrescar el layout para que `initialRole` refleje el nuevo rol (no el admin cacheado).
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Navegación de organizador' })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('navigation', { name: 'Navegación de administración' }),
    ).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
