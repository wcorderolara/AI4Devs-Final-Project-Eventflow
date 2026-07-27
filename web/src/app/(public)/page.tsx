import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getServerSessionClaims } from '@/shared/auth-session/serverSession';
import { SessionStateProbe } from '@/shared/auth-session/SessionStateProbe';
import { LandingPage } from '@/features/marketing';
import { ThrowOnParam } from '@/shared/providers/ThrowOnParam';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Metadata de la home. Server-side y localizada: el `<title>` y la descripción salen del catálogo
 * del locale que ya resolvió el middleware, igual que el resto del render.
 *
 * **No** se declaran `alternates.languages`: EventFlow no enruta el locale por URL (sin prefijo
 * `/es`, `/en` — Doc 15 §17/§31.2), así que las cuatro traducciones viven en la misma dirección.
 * Publicar cuatro `hreflang` apuntando todos a `/` sería una señal falsa para el crawler. El
 * `x-default` del layout raíz ya cubre el caso.
 *
 * Tampoco se declara `openGraph.images`: no existe todavía un asset OG aprobado en el repositorio
 * y no se enlaza uno de Stitch. Inventarlo daría una tarjeta rota al compartir.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common.landing.metadata');
  const title = t('title');
  const description = t('description');

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      siteName: 'EventFlow',
      title,
      description,
    },
    twitter: { card: 'summary', title, description },
  };
}

/**
 * `/` — landing pública (PB-P2-032, alineada con la screen Stitch *EventFlow - Inicio*).
 *
 * La route se limita a resolver la sesión en el servidor y delegar la composición a la feature.
 * Así el CTA correcto viaja ya en el HTML inicial: quien tiene sesión no ve «Crear cuenta» para
 * que un segundo después se lo sustituya el cliente.
 */
export default function Landing(): React.JSX.Element {
  const claims = getServerSessionClaims();

  return (
    <>
      <Suspense>
        <ThrowOnParam />
      </Suspense>

      <LandingPage claims={claims} />

      <SessionStateProbe />
    </>
  );
}
