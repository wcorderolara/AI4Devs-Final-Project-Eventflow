'use client';

// Contenedor del directorio (US-045 / FE-001). Sincroniza filtros con URL (`useSearchParams`)
// para deep-linking, orquesta `useInfiniteQuery`, y renderiza los estados (loading, empty,
// error, success, "Cargar más" con `aria-busy`).
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useVendorDirectorySearch } from '../hooks/vendorDirectoryQueries';
import type { VendorCurrencyCode } from '../api/vendorDirectoryApi.types';
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
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500">{t('subtitle')}</p>
      </header>

      <VendorFilters
        value={draft}
        onChange={setDraft}
        onSubmit={() => applyFilters(draft)}
        onReset={handleReset}
      />

      {search.isLoading ? (
        <div role="status" aria-live="polite" className="p-6 text-neutral-500">
          {t('loading')}
        </div>
      ) : null}

      {search.isError ? (
        <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t('error')}
        </div>
      ) : null}

      {showEmpty ? (
        <div className="flex flex-col items-start gap-2 rounded border border-neutral-200 bg-white p-6">
          <p>{t('empty.body')}</p>
          <button
            type="button"
            onClick={handleReset}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {t('empty.cta')}
          </button>
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul
          aria-label={t('grid.ariaLabel')}
          className="grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((vendor) => (
            <li key={vendor.id}>
              <VendorCard vendor={vendor} />
            </li>
          ))}
        </ul>
      ) : null}

      {search.hasNextPage ? (
        <button
          type="button"
          onClick={() => void search.fetchNextPage()}
          disabled={search.isFetchingNextPage}
          aria-busy={search.isFetchingNextPage}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
        >
          {search.isFetchingNextPage ? t('loadMore.loading') : t('loadMore.label')}
        </button>
      ) : null}
    </div>
  );
}
