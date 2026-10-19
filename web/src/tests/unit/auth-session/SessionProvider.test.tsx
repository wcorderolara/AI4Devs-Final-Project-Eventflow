import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionProvider, useSession } from '@/shared/auth-session';
import { server } from '@/tests/msw/server';

function Consumer() {
  const { isAuthenticated, isError, role } = useSession();
  return (
    <div>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="error">{String(isError)}</span>
    </div>
  );
}

function renderSession(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>,
  );
}

// El backend emite la cookie de sesión (HTTP-only) junto con `eventflow_role`; aquí se simula esa
// cookie legible porque jsdom no aplica el `Set-Cookie` de las respuestas mockeadas.
const setRoleCookie = (role: string): void => {
  document.cookie = `eventflow_role=${role}; path=/`;
};

afterEach(() => {
  document.cookie = 'eventflow_role=; path=/; max-age=0';
});

describe('<SessionProvider> hidratado', () => {
  it('sin cookie de rol → anónimo sin llamar a /users/me', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/v1/users/me', () => {
        calls += 1;
        return HttpResponse.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'x' } }, { status: 401 });
      }),
    );
    renderSession(<Consumer />);
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('false');
    expect(calls).toBe(0);
  });

  it('401 → sesión anónima (no error)', async () => {
    // Cookie de rol vencida o huérfana: el backend tiene la última palabra.
    setRoleCookie('organizer');
    renderSession(<Consumer />);
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('false');
  });

  it('200 → autenticado con rol', async () => {
    server.use(
      http.get('*/api/v1/users/me', () =>
        HttpResponse.json({
          data: { id: 'u1', email: 'a@b.com', name: 'Ana', role: 'organizer', status: 'active', preferredLanguage: 'es-LATAM', phone: null, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' },
          meta: { correlationId: 'req_test_me' },
        }),
      ),
    );
    setRoleCookie('organizer');
    renderSession(<Consumer />);
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));
    expect(screen.getByTestId('role')).toHaveTextContent('organizer');
  });
});
