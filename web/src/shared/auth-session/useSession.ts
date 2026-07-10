'use client';

import { useContext } from 'react';
import { SessionContext } from './SessionProvider';
import type { SessionState } from './types';

/**
 * Devuelve `{ user, role, isAuthenticated, isLoading, isError, refetch }`. Refleja únicamente lo que
 * el backend afirmó en `GET /me` (ADR-FE-003). No expone `permissions` (backend) ni `locale`
 * (vive en `useLocale()` de US-104).
 */
export function useSession(): SessionState {
  return useContext(SessionContext);
}
