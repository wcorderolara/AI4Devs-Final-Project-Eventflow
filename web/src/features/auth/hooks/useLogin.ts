'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authRegisterApi } from '../api/authApi';
import type { LoginRequestDTO } from '../api/authApi.types';
import type { RegisteredUser } from '../types';

/**
 * Valida que `from` sea una ruta INTERNA (previene open redirect — US-105 SEC/EC-04).
 * Descarta URLs absolutas (`http…`), protocol-relative (`//…`) y valores con caracteres
 * fuera del allowlist.
 */
export function safeInternalPath(from: string | null | undefined): string | null {
  if (!from) return null;
  if (!/^\/[a-zA-Z0-9_/\-?=&%.]*$/.test(from)) return null;
  if (from.startsWith('//')) return null;
  return from;
}

/** Dashboard por rol (AC-02). */
export function roleHome(role: RegisteredUser['role']): string {
  if (role === 'admin') return '/admin';
  if (role === 'vendor') return '/vendor';
  return '/organizer';
}

/**
 * Mutation de login (US-003 / FE-004, FE-005). En éxito invalida `['me']` (el SessionProvider
 * rehidrata vía `GET /users/me`, AC-02) y redirige: `from` interno validado > dashboard del rol
 * devuelto por el backend.
 */
export function useLogin(options: { from?: string | null } = {}): ReturnType<
  typeof useMutation<RegisteredUser, Error, LoginRequestDTO>
> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<RegisteredUser, Error, LoginRequestDTO>({
    mutationFn: (input) => authRegisterApi.login(input),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(safeInternalPath(options.from) ?? roleHome(user.role));
    },
  });
}
