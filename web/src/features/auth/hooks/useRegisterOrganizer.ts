'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authRegisterApi } from '../api/authApi';
import type { RegisterOrganizerRequestDTO } from '../api/authApi.types';
import type { RegisteredUser } from '../types';

/**
 * Mutation de registro de organizador (US-001 / FE-004). En éxito invalida la sesión (`['me']`)
 * para que `SessionProvider` hidrate al usuario recién autenticado (la cookie ya fue emitida por
 * el backend) y redirige al dashboard del organizador (AC-01). El mapeo `code → mensaje i18n`
 * ocurre en el componente (namespace `auth.register.errors`).
 */
export function useRegisterOrganizer(): ReturnType<
  typeof useMutation<RegisteredUser, Error, Omit<RegisterOrganizerRequestDTO, 'role'>>
> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<RegisteredUser, Error, Omit<RegisterOrganizerRequestDTO, 'role'>>({
    mutationFn: (input) => authRegisterApi.registerOrganizer(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/organizer');
    },
  });
}
