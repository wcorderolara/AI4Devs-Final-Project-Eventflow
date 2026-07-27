import { cookies } from 'next/headers';
import { COOKIE_ROLE, isRole } from '@/shared/authorization';
import { AuthenticatedShell } from '@/shared/navigation';

/**
 * Shell autenticado de `organizer` y `vendor`.
 *
 * Pasa a ser **Server Component**: resuelve el rol antes de renderizar y delega la composición en
 * `AuthenticatedShell`, compartido con `(admin)`. La parte cliente queda acotada a lo que
 * realmente necesita interacción (drawer, menú de usuario, ruta activa).
 *
 * El rol sale del claim UX `eventflow_role` — la misma cookie que `roleGuardMiddleware` ya usa
 * para permitir la entrada a la ruta — y el shell lo reconcilia con `GET /users/me`, que es la
 * autoridad. **Ya no se deduce de la URL**: antes este layout elegía el menú con
 * `pathname.startsWith('/vendor')`, de modo que la navegación dependía del destino y no de quién
 * había iniciado sesión. Sin claim válido no se cae a `organizer`: el shell se monta sin
 * navegación.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const roleClaim = cookies().get(COOKIE_ROLE)?.value;

  return (
    // Se conserva la caja de contenido previa (`flex`): las vistas de este group ya aportan su
    // propio padding.
    <AuthenticatedShell initialRole={isRole(roleClaim) ? roleClaim : null} mainClassName="flex">
      {children}
    </AuthenticatedShell>
  );
}
