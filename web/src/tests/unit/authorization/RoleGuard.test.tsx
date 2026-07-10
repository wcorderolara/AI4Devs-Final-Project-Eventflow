import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleGuard } from '@/shared/authorization';
import type { SessionState } from '@/shared/auth-session';

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/auth-session', () => ({ useSession: useSessionMock }));

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

beforeEach(() => useSessionMock.mockReset());

describe('<RoleGuard> (UX-only)', () => {
  it('rol permitido → renderiza children', () => {
    useSessionMock.mockReturnValue(session({ role: 'organizer', isAuthenticated: true }));
    render(
      <RoleGuard allow={['organizer']}>
        <span>secreto</span>
      </RoleGuard>,
    );
    expect(screen.getByText('secreto')).toBeInTheDocument();
  });

  it('rol NO permitido → renderiza fallback (no children)', () => {
    useSessionMock.mockReturnValue(session({ role: 'organizer', isAuthenticated: true }));
    render(
      <RoleGuard allow={['admin']} fallback={<span>bloqueado</span>}>
        <span>secreto</span>
      </RoleGuard>,
    );
    expect(screen.queryByText('secreto')).not.toBeInTheDocument();
    expect(screen.getByText('bloqueado')).toBeInTheDocument();
  });

  it('isLoading → fallback (evita flash, SEC-06)', () => {
    useSessionMock.mockReturnValue(session({ isLoading: true }));
    render(
      <RoleGuard allow={['organizer']}>
        <span>secreto</span>
      </RoleGuard>,
    );
    expect(screen.queryByText('secreto')).not.toBeInTheDocument();
  });
});
