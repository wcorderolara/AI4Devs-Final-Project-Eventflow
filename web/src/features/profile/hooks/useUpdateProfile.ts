'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { UpdateProfileRequestDTO, UserProfile } from '../api/profileApi.types';
import { PROFILE_QUERY_KEY } from './useMyProfile';

/**
 * `useUpdateProfile` (US-006 / AC-02). `PATCH /api/v1/users/me`. En éxito invalida la query de
 * perfil y la de sesión (`['me']`) para que el Topbar/UserMenu reflejen el nuevo nombre.
 */
export function useUpdateProfile(): ReturnType<
  typeof useMutation<UserProfile, Error, UpdateProfileRequestDTO>
> {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, UpdateProfileRequestDTO>({
    mutationFn: (input) => profileApi.updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
