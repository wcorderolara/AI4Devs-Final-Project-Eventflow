'use client';

// Hooks TanStack — vendor reviews public listing (US-066 / PB-P1-039 / FE-003).
//
// `useVendorReviews(vendorId, {pageSize})` usa `useInfiniteQuery` con cursor keyset. La página
// siguiente se decide por `pagination.nextCursor` (D1). El queryKey incluye `vendorId` +
// `pageSize` para evitar mezclar caches entre vendors o tamaños de página.
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { vendorReviewsApi } from '../api/vendorReviewsApi';
import type {
  ListVendorReviewsView,
  ListVendorReviewsQuery,
} from '../api/vendorReviewsApi.types';
import type { ApiError } from '@/shared/api-client';

export const vendorReviewsKeys = {
  all: ['vendor-reviews'] as const,
  list: (vendorId: string, pageSize?: number) =>
    ['vendor-reviews', 'list', vendorId, pageSize ?? 'default'] as const,
} as const;

export interface UseVendorReviewsOptions {
  pageSize?: number;
  enabled?: boolean;
}

export function useVendorReviews(
  vendorId: string,
  { pageSize, enabled = true }: UseVendorReviewsOptions = {},
) {
  return useInfiniteQuery<
    ListVendorReviewsView,
    ApiError,
    InfiniteData<ListVendorReviewsView, string | undefined>,
    ReturnType<typeof vendorReviewsKeys.list>,
    string | undefined
  >({
    queryKey: vendorReviewsKeys.list(vendorId, pageSize),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => {
      const query: ListVendorReviewsQuery = {};
      if (pageParam) query.cursor = pageParam;
      if (pageSize !== undefined) query.pageSize = pageSize;
      return vendorReviewsApi.list(vendorId, query);
    },
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled: enabled && vendorId.length > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
