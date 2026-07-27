import type { Role } from '@/shared/authorization';

/**
 * Destino de workspace de cada rol — **única** definición del mapa `rol → ruta home`.
 *
 * Existía duplicado de facto: `features/auth/hooks/useLogin` lo resolvía para la redirección
 * post-login y cualquier superficie nueva (header público, CTA de la landing) tendería a
 * recodificarlo. Al vivir aquí, en un módulo sin `'use client'` ni dependencias de React, lo
 * pueden consumir tanto los Client Components de auth como los Server Components públicos.
 *
 * Las tres rutas existen en el App Router (`(app)/organizer`, `(app)/vendor`, `(admin)/admin`).
 * Este módulo **no autoriza nada**: `roleGuardMiddleware` protege el routing y el backend valida
 * cada request (ADR-FE-003/015).
 */
export const ROLE_HOME: Record<Role, string> = {
  organizer: '/organizer',
  vendor: '/vendor',
  admin: '/admin',
};

/** Home del workspace del rol. */
export function roleHome(role: Role): string {
  return ROLE_HOME[role];
}
