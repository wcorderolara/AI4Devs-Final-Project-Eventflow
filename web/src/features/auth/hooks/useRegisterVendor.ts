'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authRegisterApi } from '../api/authApi';
import type { RegisterVendorRequestDTO } from '../api/authApi.types';
import type { RegisteredUser } from '../types';

/**
 * Mutation de registro de proveedor (US-002 / FE-003, FE-004). En éxito invalida la sesión
 * (`['me']`) y redirige al onboarding del vendor (AC-02: CTA "Completar mi perfil" hacia el
 * formulario de US-040). Ruta sin prefijo de locale (nota N3 del execution record).
 */
export function useRegisterVendor(): ReturnType<
  typeof useMutation<RegisteredUser, Error, Omit<RegisterVendorRequestDTO, 'role'>>
> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<RegisteredUser, Error, Omit<RegisterVendorRequestDTO, 'role'>>({
    mutationFn: (input) => authRegisterApi.registerVendor(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/vendor/onboarding');
    },
  });
}
