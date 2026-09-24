'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { roleHome } from '@/shared/navigation/roleHome';
import { authRegisterApi } from '../api/authApi';
import type { RegisteredUser } from '../types';

/**
 * US-008 / FE-002 — Completa el signup OAuth con el rol seleccionado. En éxito invalida `['me']`
 * (el SessionProvider rehidrata vía `GET /users/me`) y redirige al dashboard del rol devuelto por
 * el backend. `router.refresh()` re-ejecuta los layouts Server Component con la cookie de rol ya
 * emitida (mismo patrón que `useLogin`).
 */
export function useCompleteGoogleSignup(): ReturnType<
  typeof useMutation<RegisteredUser, Error, 'organizer' | 'vendor'>
> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<RegisteredUser, Error, 'organizer' | 'vendor'>({
    mutationFn: (role) => authRegisterApi.completeGoogleSignup(role),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(roleHome(user.role));
      router.refresh();
    },
  });
}

/**
 * US-008 / FE-003 — Confirma la vinculación de la cuenta Google a una cuenta existente. En éxito
 * redirige al dashboard del rol. Si el usuario cancela, el componente navega a `/login` sin
 * vincular (la sesión queda anónima — AC-03).
 */
export function useConfirmGoogleLink(): ReturnType<typeof useMutation<RegisteredUser, Error, void>> {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation<RegisteredUser, Error, void>({
    mutationFn: () => authRegisterApi.confirmGoogleLink(),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(roleHome(user.role));
      router.refresh();
    },
  });
}
