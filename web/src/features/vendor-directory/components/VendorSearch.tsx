'use client';

// Contenedor del directorio (US-045 / FE-001). Sincroniza filtros con URL (`useSearchParams`)
// para deep-linking, orquesta `useInfiniteQuery`, y renderiza los estados (loading, empty,
// error, success, "Cargar más" con `aria-busy`).
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useVendorDirectorySearch } from '../hooks/vendorDirectoryQueries';
import type { VendorCurrencyCode } from '../api/vendorDirectoryApi.types';
import { Button } from '@/shared/design-system';
import { InfiniteLoader } from './InfiniteLoader';
import { VendorCard } from './VendorCard';
import { VendorFilters, type VendorFiltersValue } from './VendorFilters';

function readFromSearchParams(sp: URLSearchParams): VendorFiltersValue {
  return {
    categoryCode: sp.get('categoryCode') ?? '',
    locationCode: sp.get('locationCode') ?? '',
    priceMin: sp.get('priceMin') ?? '',
    priceMax: sp.get('priceMax') ?? '',
    currency: (sp.get('currency') as VendorFiltersValue['currency']) ?? '',
  };
}

function serializeToSearchParams(value: VendorFiltersValue): URLSearchParams {
  const params = new URLSearchParams();
  if (value.categoryCode.trim()) params.set('categoryCode', value.categoryCode.trim());
  if (value.locationCode.trim()) params.set('locationCode', value.locationCode.trim());
  if (value.priceMin.trim()) params.set('priceMin', value.priceMin.trim());
  if (value.priceMax.trim()) params.set('priceMax', value.priceMax.trim());
  if (value.currency) params.set('currency', value.currency);
  return params;
}

export function VendorSearch(): JSX.Element {
  const t = useTranslations('vendor.directory');
  const router = useRouter();
  const searchParams = useSearchParams();

  // La URL es la fuente de verdad; el estado local es un draft para poder editar filtros sin
  // ejecutar una nueva búsqueda hasta que el usuario presione "Aplicar".
  const initialFromUrl = useMemo(
    () => readFromSearchParams(new URLSearchParams(searchParams?.toString() ?? '')),
    [searchParams],
  );
  const [draft, setDraft] = useState<VendorFiltersValue>(initialFromUrl);

  const active = initialFromUrl;

  const search = useVendorDirectorySearch({
    categoryCode: active.categoryCode || undefined,
    locationCode: active.locationCode || undefined,
    priceMin: active.priceMin || undefined,
    priceMax: active.priceMax || undefined,
    currency: (active.currency as VendorCurrencyCode) || undefined,
  });

  function applyFilters(next: VendorFiltersValue) {
    const params = serializeToSearchParams(next);
    router.push(`?${params.toString()}`);
  }

  function handleReset() {
    setDraft({ categoryCode: '', locationCode: '', priceMin: '', priceMax: '', currency: '' });
    router.push('?');
  }

  const items = search.data?.pages.flatMap((p) => p.items) ?? [];
  const showEmpty = !search.isLoading && !search.isError && items.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6">
      <header>
        <h1 className="font-display text-[2.25rem] font-medium leading-tight text-primary sm:text-[2.75rem]">
          {t('title')}
        </h1>
        <p className="mt-2 max-w-[60ch] font-body text-body-md text-secondary">{t('subtitle')}</p>
      </header>

      <VendorFilters
        value={draft}
        onChange={setDraft}
        onSubmit={() => applyFilters(draft)}
        onReset={handleReset}
      />

      {search.isLoading ? (
        <div role="status" aria-live="polite" className="py-6 font-ui text-body-sm text-muted">
          {t('loading')}
        </div>
      ) : null}

      {search.isError ? (
        <div
          role="alert"
          className="border border-feedback-error bg-feedback-error p-4 font-ui text-body-sm text-feedback-error"
        >
          {t('error')}
        </div>
      ) : null}

      {showEmpty ? (
        <div className="flex flex-col items-start gap-4 border border-dashed border-default bg-surface px-6 py-10">
          <p className="font-display text-[1.5rem] font-medium text-primary">{t('empty.body')}</p>
          <Button type="button" variant="secondary" onClick={handleReset}>
            {t('empty.cta')}
          </Button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul
          aria-label={t('grid.ariaLabel')}
          className="grid list-none gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {items.map((vendor) => (
            <li key={vendor.id}>
              {/* `h2`: el `h1` es el título del directorio. Enlaza al perfil público. */}
              <VendorCard vendor={vendor} linkToProfile headingLevel={2} />
            </li>
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <InfiniteLoader
          hasMore={Boolean(search.hasNextPage)}
          isLoading={search.isFetchingNextPage}
          hasError={search.isFetchNextPageError}
          onLoadMore={() => void search.fetchNextPage()}
          labels={{
            loadMore: t('loadMore.label'),
            loading: t('loadMore.loading'),
            end: t('loadMore.end'),
            error: t('loadMore.error'),
            retry: t('loadMore.retry'),
          }}
        />
      ) : null}
    </div>
  );
}
