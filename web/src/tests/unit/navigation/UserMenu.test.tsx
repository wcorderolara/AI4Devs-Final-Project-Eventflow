import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/shared/auth-session';
import { UserMenu } from '@/shared/navigation';

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/auth-session', () => ({ useSession: useSessionMock }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));

const messages = { navigation: { userMenu: { myProfile: 'Mi perfil', logout: 'Cerrar sesión' } } };

function session(overrides: Partial<SessionState>): SessionState {
  return {
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    isError: false,
    refetch: () => {},
    ...overrides,
  };
}

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="es-LATAM" messages={messages}>
      <UserMenu />
    </NextIntlClientProvider>,
  );
}

describe('<UserMenu>', () => {
  it('sesión anónima → no renderiza nada', () => {
    useSessionMock.mockReturnValue(session({}));
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it('autenticado → muestra la inicial del displayName', () => {
    useSessionMock.mockReturnValue(
      session({
        isAuthenticated: true,
        role: 'organizer',
        user: { id: 'u1', email: 'a@b.com', displayName: 'Ana' },
      }),
    );
    renderMenu();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
