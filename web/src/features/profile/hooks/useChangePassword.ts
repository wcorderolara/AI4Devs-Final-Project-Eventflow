'use client';

import { useMutation } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import type { ChangePasswordRequestDTO } from '../api/profileApi.types';

/**
 * `useChangePassword` (US-006 / AC-04). `POST /api/v1/users/me/change-password`. La sesión actual
 * se conserva (el backend solo invalida "otras sesiones"); no se invalida `['me']` en éxito.
 */
export function useChangePassword(): ReturnType<
  typeof useMutation<void, Error, ChangePasswordRequestDTO>
> {
  return useMutation<void, Error, ChangePasswordRequestDTO>({
    mutationFn: (input) => profileApi.changePassword(input),
  });
}
