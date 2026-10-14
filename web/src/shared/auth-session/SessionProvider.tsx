'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useMemo, type ReactNode } from 'react';
import { ApiError } from '@/shared/api-client';
import { COOKIE_ROLE } from '@/shared/authorization';
import { authApi } from './authApi';
import type { SessionState } from './types';

const ANONYMOUS: SessionState = {
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  isError: false,
  refetch: () => {},
};

export const SessionContext = createContext<SessionState>(ANONYMOUS);

/**
 * Hint de sesión en el navegador: el backend emite **siempre** la cookie de sesión (HTTP-only) junto
 * con `eventflow_role` (legible, sólo UX) y las limpia juntas en el logout. Sin `eventflow_role` no
 * hay sesión que preguntar, así que un visitante anónimo no dispara `GET /users/me` (evita el 401
 * en cada página pública). No es un security boundary: con la cookie presente, el backend decide.
 */
function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return true;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${COOKIE_ROLE}=`));
}

/**
 * `<SessionProvider>` hidratado (US-106) — reemplaza el esqueleto de US-105. Hidrata la sesión con
 * `useQuery(['me'])`. Sin cookie de rol la sesión es anónima sin ir a la red; un 401 también se
 * interpreta como **sesión anónima** (no error). Cualquier otro error
 * (NETWORK/TIMEOUT/5xx) deja `isError: true`.
 */
export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => (hasSessionHint() ? authApi.me() : Promise.resolve(null)),
    staleTime: 60_000,
    retry: false,
  });

  const value = useMemo<SessionState>(() => {
    const isUnauthenticated = error instanceof ApiError && error.status === 401;
    return {
      user: data?.user ?? null,
      role: data?.role ?? null,
      isAuthenticated: Boolean(data),
      isLoading,
      isError: isError && !isUnauthenticated,
      refetch: () => {
        void refetch();
      },
    };
  }, [data, isLoading, isError, error, refetch]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
