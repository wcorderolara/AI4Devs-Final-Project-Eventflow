import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
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

describe('<SessionProvider> hidratado', () => {
  it('401 → sesión anónima (no error)', async () => {
    renderSession(<Consumer />);
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('false'));
    expect(screen.getByTestId('error')).toHaveTextContent('false');
  });

  it('200 → autenticado con rol', async () => {
    server.use(
      http.get('*/api/v1/auth/me', () =>
        HttpResponse.json({
          user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
          role: 'organizer',
          locale: 'es-LATAM',
        }),
      ),
    );
    renderSession(<Consumer />);
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('true'));
    expect(screen.getByTestId('role')).toHaveTextContent('organizer');
  });
});
