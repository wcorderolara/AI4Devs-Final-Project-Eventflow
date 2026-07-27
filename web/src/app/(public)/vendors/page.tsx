import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  PublicVendorDirectory,
  type PublicVendorDirectorySearchParams,
} from '@/features/vendor-public';

/**
 * `/vendors` — directorio público de proveedores aprobados.
 *
 * Sustituye el placeholder «Próximamente» por datos reales de `GET /public/vendors`. Es una
 * superficie pública e indexable: `robots.ts` la permite explícitamente y `sitemap.ts` la lista
 * con prioridad 0.8, y es el destino del CTA «Explorar proveedores» de la landing para visitantes
 * sin cuenta.
 *
 * `dynamic = 'force-dynamic'`: los filtros y el cursor viajan en la query string, así que cada
 * combinación es una respuesta distinta. El cacheado real lo aportan el `Cache-Control` del
 * backend y el `revalidate` del cliente de API.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('vendor.directory.metadata');
  const title = t('title');
  const description = t('description');

  return {
    title,
    description,
    alternates: { canonical: '/vendors' },
    openGraph: { type: 'website', url: '/vendors', siteName: 'EventFlow', title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default function VendorsPage({
  searchParams,
}: {
  searchParams?: PublicVendorDirectorySearchParams;
}): React.JSX.Element {
  return <PublicVendorDirectory searchParams={searchParams} />;
}
