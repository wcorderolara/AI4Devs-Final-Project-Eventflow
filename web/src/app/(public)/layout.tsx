import { getServerSessionClaims } from '@/shared/auth-session/serverSession';
import { Footer, PublicHeader, SkipLink } from '@/shared/navigation';

/**
 * Layout de las superficies públicas.
 *
 * La sesión se resuelve **aquí**, en el servidor, y se pasa al header: es lo que permite que un
 * visitante con sesión reciba directamente la acción de su workspace en el HTML inicial, en vez
 * de «Iniciar sesión / Registrarse» seguido de un cambio al hidratar.
 *
 * El `PublicHeader` sustituye a la fila de enlaces que vivía aquí en línea (marca + directorio +
 * login + registro + idioma), que no tenía navegación mobile ni conocía la sesión. El resto del
 * layout —skip link, `main`, footer— se conserva igual.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const claims = getServerSessionClaims();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SkipLink />
      <PublicHeader claims={claims} />
      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}
