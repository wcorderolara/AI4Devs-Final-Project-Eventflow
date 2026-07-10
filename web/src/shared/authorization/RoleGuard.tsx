'use client';

import type { ReactNode } from 'react';
import { useSession } from '@/shared/auth-session';
import type { Role } from './types';

export interface RoleGuardProps {
  allow: Role[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * `<RoleGuard>` — **UX guard, NO security boundary** (ADR-FE-003). Solo muestra/oculta UI según el
 * rol de `useSession()`. El backend es la única fuente de autorización y valida cada request de
 * forma independiente. Durante `isLoading` renderiza `fallback` (evita flash de contenido prohibido,
 * SEC-06). No lanza ni redirige.
 */
export function RoleGuard({ allow, fallback = null, children }: RoleGuardProps): React.JSX.Element {
  const { role, isLoading } = useSession();
  if (isLoading) return <>{fallback}</>;
  if (role && allow.includes(role)) return <>{children}</>;
  return <>{fallback}</>;
}
