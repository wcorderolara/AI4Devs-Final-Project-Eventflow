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
import {
  DIRECTORY_CURSOR_PARAM,
  DIRECTORY_PAGE_SIZE,
  directoryFiltersToSearchParams,
  readDirectoryFilters,
  type VendorSearchQuery,
} from '@/features/vendor-directory';
import { Alert } from '@/shared/design-system';
import { publicVendorDirectoryApi } from '../api/publicVendorDirectoryApi';
import { PublicVendorDirectoryFilters } from './PublicVendorDirectoryFilters';
import { PublicVendorGrid } from './PublicVendorGrid';

/**
 * Query params de la página (nombres públicos de `DIRECTORY_URL_PARAMS`: `category`, `city`,
 * `minPrice`, `maxPrice`, `currency`, `cursor`). Cualquier otro se ignora.
 */
export type PublicVendorDirectorySearchParams = Partial<Record<string, string | string[]>>;

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function PublicVendorDirectory({
  searchParams = {},
}: {
  searchParams?: PublicVendorDirectorySearchParams;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('vendor.directory');
  const filters = readDirectoryFilters((name) => firstOf(searchParams[name]));
  const cursor = firstOf(searchParams[DIRECTORY_CURSOR_PARAM]) || undefined;

  const query: VendorSearchQuery = {
    categoryCode: filters.categoryCode || undefined,
    locationCode: filters.locationCode || undefined,
    priceMin: filters.priceMin || undefined,
    priceMax: filters.priceMax || undefined,
    currency: (filters.currency || undefined) as VendorSearchQuery['currency'],
    // Viaja también a las páginas siguientes (el grid reenvía `query` con cada cursor).
    limit: DIRECTORY_PAGE_SIZE,
  };
  const result = await publicVendorDirectoryApi.list({ ...query, cursor });

  const items = result.status === 'ok' ? result.data.items : [];
  const nextCursor = result.status === 'ok' ? result.data.page.cursor : null;
  const hasNext = result.status === 'ok' && result.data.page.hasNext && nextCursor !== null;

  return (
    <div className="mx-auto w-full max-w-marketing px-page-mobile py-12 sm:px-page-tablet sm:py-16">
      <header className="mb-8">
        <h1 className="font-display text-[2.75rem] font-medium leading-[1.05] text-primary sm:text-[3.5rem]">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-[60ch] font-body text-body-lg text-secondary">{t('subtitle')}</p>
      </header>

      <PublicVendorDirectoryFilters value={filters} />

      <div className="mt-6">
        {result.status === 'invalid_filters' ? (
          // Un 400 siempre viene de los filtros de la URL, que el visitante puede corregir.
          <Alert variant="warning">{t('invalidFilters')}</Alert>
        ) : null}

        {result.status === 'error' ? <Alert variant="error">{t('error')}</Alert> : null}

        {result.status === 'ok' && items.length === 0 ? (
          <div className="border border-dashed border-default bg-surface px-6 py-10">
            <p className="font-display text-[1.5rem] font-medium text-primary">{t('empty.body')}</p>
            <Link
              href="/vendors"
              className="focus-ring mt-3 inline-flex font-ui text-body-sm font-semibold text-link hover:text-link-hover"
            >
              {t('empty.cta')}
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          // `key`: cambiar de filtros reinicia el listado acumulado del infinite scroll.
          <PublicVendorGrid
            key={JSON.stringify(query)}
            initialItems={items}
            initialCursor={nextCursor}
            initialHasNext={hasNext}
            query={JSON.parse(JSON.stringify(query)) as VendorSearchQuery}
            nextHref={
            hasNext && nextCursor
              ? `/vendors?${directoryFiltersToSearchParams(filters, nextCursor).toString()}`
              : null
          }
          />
        ) : null}
      </div>
    </div>
  );
}
