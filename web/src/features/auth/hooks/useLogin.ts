'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { roleHome as sharedRoleHome } from '@/shared/navigation/roleHome';
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

/**
 * Dashboard por rol (AC-02). El mapa vive en `shared/navigation/roleHome`: es el mismo que
 * consumen el header público y los CTA de la landing, y tenerlo en un solo sitio evita que la
 * redirección post-login y la navegación pública se separen.
 */
export function roleHome(role: RegisteredUser['role']): string {
  return sharedRoleHome(role);
}

/**
 * Mutation de login (US-003 / FE-004, FE-005). En éxito invalida `['me']` (el SessionProvider
 * rehidrata vía `GET /users/me`, AC-02) y redirige: `from` interno validado > dashboard del rol
 * devuelto por el backend.
 *
 * Tras redirigir se llama `router.refresh()`: `router.push`/`replace` son navegaciones *soft* y
 * NO re-ejecutan los Server Component layouts, que resuelven `initialRole` leyendo la cookie
 * `eventflow_role` en el servidor. Sin el refresh, el Router Cache sirve el layout con el rol de
 * la sesión anterior — p.ej. iniciar sesión como `organizer` justo tras cerrar sesión de `admin`
 * (mismo browser) mostraba el menú de admin hasta un recargado completo. El refresh invalida ese
 * cache y re-renderiza con la cookie ya actualizada.
 */
export function useLogin(
  options: { from?: string | null } = {},
): ReturnType<typeof useMutation<RegisteredUser, Error, LoginRequestDTO>> {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<RegisteredUser, Error, LoginRequestDTO>({
    mutationFn: (input) => authRegisterApi.login(input),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push(safeInternalPath(options.from) ?? roleHome(user.role));
      router.refresh();
    },
  });
}
