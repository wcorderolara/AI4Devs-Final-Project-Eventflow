import { cookies } from 'next/headers';
import { COOKIE_ROLE, isRole } from '@/shared/authorization';
import { AuthenticatedShell } from '@/shared/navigation';

/**
 * Shell autenticado de `admin`.
 *
 * Pasa a ser **Server Component** y monta el mismo `AuthenticatedShell` que `(app)` (UI-DEC-008:
 * un único shell para los tres roles). La sidebar agrupada del admin ya no se elige aquí: la
 * decide `getRoleNavigation()` a partir del rol de la sesión. Sin cambios de rutas, grupos,
 * guards ni densidad del contenido (`p-6` se conserva).
 *
 * `roleGuardMiddleware` sigue siendo quien impide que un no-admin llegue a `/admin/*`; este
 * layout sólo decide qué se pinta.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const roleClaim = cookies().get(COOKIE_ROLE)?.value;

  return (
    <AuthenticatedShell initialRole={isRole(roleClaim) ? roleClaim : null} mainClassName="p-6">
      {children}
    </AuthenticatedShell>
  );
}
