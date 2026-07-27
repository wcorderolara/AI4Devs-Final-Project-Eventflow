// Directorio público de proveedores (`/vendors`) — Server Component.
//
// Sustituye el placeholder «Próximamente» por datos reales de `GET /public/vendors`. Se renderiza
// en el servidor porque es una superficie SEO: `robots.ts` la permite y `sitemap.ts` la lista con
// prioridad 0.8, así que el listado tiene que estar en el HTML inicial y funcionar sin JavaScript.
//
// La única pieza de cliente es el formulario de filtros. La paginación son **enlaces** con el
// cursor en la URL, no un botón «cargar más»: así es rastreable, compartible y sigue funcionando
// sin JS. El directorio autenticado (`/organizer/vendors`) conserva su scroll infinito — allí
// prima la fluidez y no hay SEO que preservar.
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { VendorCard, type VendorFiltersValue } from '@/features/vendor-directory';
import { Alert } from '@/shared/design-system';
import { publicVendorDirectoryApi } from '../api/publicVendorDirectoryApi';
import { PublicVendorDirectoryFilters } from './PublicVendorDirectoryFilters';

/** Query params soportados. Cualquier otro se ignora: el backend valida en estricto. */
export interface PublicVendorDirectorySearchParams {
  categoryCode?: string;
  locationCode?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: string;
  cursor?: string;
}

function readFilters(params: PublicVendorDirectorySearchParams): VendorFiltersValue {
  return {
    categoryCode: params.categoryCode ?? '',
    locationCode: params.locationCode ?? '',
    priceMin: params.priceMin ?? '',
    priceMax: params.priceMax ?? '',
    currency: (params.currency ?? '') as VendorFiltersValue['currency'],
  };
}

/** Enlace a la siguiente página conservando los filtros activos. */
function nextPageHref(params: PublicVendorDirectorySearchParams, cursor: string): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, cursor })) {
    if (value) next.set(key, value);
  }
  return `/vendors?${next.toString()}`;
}

export async function PublicVendorDirectory({
  searchParams = {},
}: {
  searchParams?: PublicVendorDirectorySearchParams;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('vendor.directory');
  const filters = readFilters(searchParams);

  const result = await publicVendorDirectoryApi.list({
    categoryCode: searchParams.categoryCode || undefined,
    locationCode: searchParams.locationCode || undefined,
    priceMin: searchParams.priceMin || undefined,
    priceMax: searchParams.priceMax || undefined,
    currency: (searchParams.currency || undefined) as never,
    cursor: searchParams.cursor || undefined,
  });

  const items = result.status === 'ok' ? result.data.items : [];
  const nextCursor = result.status === 'ok' ? result.data.page.cursor : null;
  const hasNext = result.status === 'ok' && result.data.page.hasNext && nextCursor !== null;

  return (
    <div className="mx-auto w-full max-w-marketing px-page-mobile py-10 sm:px-page-tablet">
      <header className="mb-6">
        <h1 className="font-heading text-h1 font-semibold text-primary">{t('title')}</h1>
        <p className="mt-2 font-body text-body-md text-secondary">{t('subtitle')}</p>
      </header>

      <PublicVendorDirectoryFilters value={filters} />

      <div className="mt-6">
        {result.status === 'invalid_filters' ? (
          // Un 400 siempre viene de los filtros de la URL, que el visitante puede corregir.
          <Alert variant="warning">{t('invalidFilters')}</Alert>
        ) : null}

        {result.status === 'error' ? <Alert variant="error">{t('error')}</Alert> : null}

        {result.status === 'ok' && items.length === 0 ? (
          <div className="rounded-card border border-subtle bg-surface-subtle p-6">
            <p className="font-body text-body-md text-secondary">{t('empty.body')}</p>
            <Link
              href="/vendors"
              className="focus-ring mt-3 inline-flex font-ui text-body-sm font-semibold text-link hover:text-link-hover"
            >
              {t('empty.cta')}
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <ul
            aria-label={t('grid.ariaLabel')}
            className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((vendor) => (
              <li key={vendor.id}>
                {/* `h2`: el `h1` es el título del directorio y no hay nivel intermedio. */}
                <VendorCard vendor={vendor} linkToProfile headingLevel={2} />
              </li>
            ))}
          </ul>
        ) : null}

        {hasNext ? (
          <Link
            href={nextPageHref(searchParams, nextCursor)}
            rel="next"
            className="focus-ring mt-6 inline-flex min-h-touch items-center rounded-button border border-action-secondary bg-action-secondary px-4 font-ui text-body-sm font-semibold text-primary hover:bg-action-secondary-hover"
          >
            {t('loadMore.label')}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
