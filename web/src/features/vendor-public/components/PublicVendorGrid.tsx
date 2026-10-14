'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  InfiniteLoader,
  VendorCard,
  type VendorCardDTO,
  type VendorSearchQuery,
} from '@/features/vendor-directory';
import { publicVendorDirectoryApi } from '../api/publicVendorDirectoryApi';

export interface PublicVendorGridProps {
  initialItems: VendorCardDTO[];
  initialCursor: string | null;
  initialHasNext: boolean;
  /** Filtros activos (sin cursor): se reenvían en cada página siguiente. */
  query: VendorSearchQuery;
  /** Enlace a la página siguiente para el HTML inicial (buscadores y navegadores sin JS). */
  nextHref: string | null;
}

/**
 * Listado del directorio público con infinite scroll.
 *
 * El servidor entrega la primera página y el enlace `rel="next"` en el HTML inicial, así que el
 * directorio sigue siendo rastreable y usable sin JavaScript. Al hidratarse, ese enlace se cambia
 * por la carga automática: las páginas siguientes se agregan debajo sin recargar.
 */
export function PublicVendorGrid({
  initialItems,
  initialCursor,
  initialHasNext,
  query,
  nextHref,
}: PublicVendorGridProps): React.JSX.Element {
  const t = useTranslations('vendor.directory');
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasNext, setHasNext] = useState(initialHasNext && initialCursor !== null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    setHasError(false);
    const result = await publicVendorDirectoryApi.list({ ...query, cursor });
    if (result.status === 'ok') {
      setItems((current) => {
        const seen = new Set(current.map((v) => v.id));
        return [...current, ...result.data.items.filter((v) => !seen.has(v.id))];
      });
      setCursor(result.data.page.cursor);
      setHasNext(result.data.page.hasNext && result.data.page.cursor !== null);
    } else {
      setHasError(true);
    }
    setIsLoading(false);
  }, [cursor, isLoading, query]);

  return (
    <>
      <ul aria-label={t('grid.ariaLabel')} className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((vendor) => (
          <li key={vendor.id}>
            {/* `h2`: el `h1` es el título del directorio y no hay nivel intermedio. */}
            <VendorCard vendor={vendor} linkToProfile headingLevel={2} />
          </li>
        ))}
      </ul>

      {hydrated ? (
        <InfiniteLoader
          hasMore={hasNext}
          isLoading={isLoading}
          hasError={hasError}
          onLoadMore={() => void loadMore()}
          labels={{
            loadMore: t('loadMore.label'),
            loading: t('loadMore.loading'),
            end: t('loadMore.end'),
            error: t('loadMore.error'),
            retry: t('loadMore.retry'),
          }}
        />
      ) : nextHref ? (
        <Link
          href={nextHref}
          rel="next"
          className="focus-ring mt-6 inline-flex min-h-touch items-center rounded-button border border-action-secondary bg-action-secondary px-4 font-ui text-body-sm font-semibold text-primary hover:bg-action-secondary-hover"
        >
          {t('loadMore.label')}
        </Link>
      ) : null}
    </>
  );
}
