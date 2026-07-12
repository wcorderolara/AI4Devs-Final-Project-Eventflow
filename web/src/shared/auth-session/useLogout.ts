'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError, httpPost } from '@/shared/api-client';

/**
 * useLogout (US-005 / FE-001..003). Llama `POST /api/v1/auth/logout` (204; el backend revoca la
 * sesión y limpia la cookie HttpOnly vía Set-Cookie). AC-02/EC-01: `204` y `401` se tratan igual
 * — se limpia el estado del cliente (queries de sesión/`auth.*`, cookie UX `eventflow_role`) y
 * se redirige a `/login`. Ante error de red se permanece en la página (sin toast — Deviation D2).
 */
export function useLogout(): ReturnType<typeof useMutation<void, Error, void>> {
  const router = useRouter();
  const queryClient = useQueryClient();

  const cleanupAndRedirect = (): void => {
    // AC-02: purga queries de sesión y del namespace auth.
    queryClient.removeQueries({
      predicate: (q) => {
        const head = q.queryKey[0]?.toString() ?? '';
        return head === 'me' || head.startsWith('auth');
      },
    });
    // Cookie UX de rol (no HttpOnly) usada por el routing guard (US-105/US-107).
    document.cookie = 'eventflow_role=; path=/; max-age=0; SameSite=Lax';
    router.replace('/login');
  };

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await httpPost<unknown, undefined>('/auth/logout');
    },
    onSuccess: cleanupAndRedirect,
    onError: (error) => {
      // EC-01: sesión ya inexistente (401) → mismo resultado que 204.
      if (error instanceof ApiError && error.status === 401) {
        cleanupAndRedirect();
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('logout.failed', error);
      }
    },
  });
}
