'use client';

import { useQuery } from '@tanstack/react-query';
import { createContext, useMemo, type ReactNode } from 'react';
import { ApiError } from '@/shared/api-client';
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
 * `<SessionProvider>` hidratado (US-106) — reemplaza el esqueleto de US-105. Hidrata la sesión con
 * `useQuery(['me'])`. Un 401 se interpreta como **sesión anónima** (no error). Cualquier otro error
 * (NETWORK/TIMEOUT/5xx) deja `isError: true`.
 */
export function SessionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
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
