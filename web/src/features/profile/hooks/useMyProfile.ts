'use client';

import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { UserProfile } from '../api/profileApi.types';

/** Query key de la feature profile (independiente de `['me']` del SessionProvider). */
export const PROFILE_QUERY_KEY = ['profile', 'me'] as const;

/**
 * `useMyProfile` (US-006 / AC-01). Consume `GET /api/v1/users/me`. Un 401 NO se reintenta
 * (`retry: false`): la página lo interpreta como sesión ausente y delega el gating a la sesión.
 */
export function useMyProfile(): ReturnType<typeof useQuery<UserProfile, Error>> {
  return useQuery<UserProfile, Error>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => profileApi.getMyProfile(),
    staleTime: 60_000,
    retry: false,
  });
}
