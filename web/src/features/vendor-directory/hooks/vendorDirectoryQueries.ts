'use client';

// Hook TanStack — `useInfiniteQuery` sobre `vendorsApi.search` (US-045 / FE-003).
// El query key incluye los filtros normalizados: cambiar cualquiera resetea el listado
// (comportamiento esperado por AC-01/AC-03 — filtros ⇒ nueva búsqueda).
import { useInfiniteQuery } from '@tanstack/react-query';
import { vendorsApi } from '../api/vendorDirectoryApi';
import type { VendorSearchDataDTO, VendorSearchQuery } from '../api/vendorDirectoryApi.types';

export const vendorDirectoryKeys = {
  all: ['vendor', 'directory'] as const,
  search: (filters: NormalizedFilters) => [...vendorDirectoryKeys.all, 'search', filters] as const,
};

export interface NormalizedFilters {
  categoryCode?: string;
  locationCode?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: VendorSearchQuery['currency'];
  limit: number;
}

const DEFAULT_LIMIT = 20;

export function normalizeFilters(input: Partial<VendorSearchQuery>): NormalizedFilters {
  const limit = input.limit ?? DEFAULT_LIMIT;
  return {
    categoryCode: emptyToUndefined(input.categoryCode),
    locationCode: emptyToUndefined(input.locationCode),
    priceMin: emptyToUndefined(input.priceMin),
    priceMax: emptyToUndefined(input.priceMax),
    currency: input.currency,
    limit,
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function useVendorDirectorySearch(input: Partial<VendorSearchQuery>) {
  const filters = normalizeFilters(input);
  return useInfiniteQuery<VendorSearchDataDTO, Error>({
    queryKey: vendorDirectoryKeys.search(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      vendorsApi.search({
        ...filters,
        cursor: pageParam as string | undefined,
      }),
    getNextPageParam: (last) => (last.page.hasNext ? last.page.cursor ?? undefined : undefined),
  });
}
