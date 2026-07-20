'use client';

// Hooks TanStack — admin reviews (US-067 moderate + US-077 list).
//
// - `useModerateReview(ctx)` — mutation atómica; invalida:
//     * `adminReviewsKeys.list(filters)` para refrescar la lista global (US-077 D5).
//     * `adminReviewsKeys.vendor(vendorId)` (histórico US-066 admin sees-all) si aplica.
//     * `['vendor-reviews', vendorId]` para paridad de US-066 (rating_avg/reviews_count
//       denormalizado cambia tras la moderación).
//     * `['public-vendor','detail',vendorSlug]` para refrescar el perfil público SEO.
//
// - `useAdminReviewsList(filters)` — infinite query con cursor keyset (paridad US-066). El
//   `queryKey` incluye los filtros normalizados para que cambiar filtros invalide la cache
//   correcta y evite mezclar páginas de filtros distintos.
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { adminReviewsApi } from '../api/adminReviewsApi';
import type {
  AdminReviewListFilters,
  AdminReviewsListDTO,
  ModerateReviewBodyDTO,
  ModeratedReviewDTO,
} from '../api/adminReviewsApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminReviewsKeys = {
  all: ['admin', 'reviews'] as const,
  list: (filters: AdminReviewListFilters) => ['admin', 'reviews', 'list', filters] as const,
  vendor: (vendorId: string) => ['admin', 'reviews', 'vendor', vendorId] as const,
} as const;

// ── moderate mutation ───────────────────────────────────────────────────────

export interface ModerateReviewInput extends ModerateReviewBodyDTO {
  reviewId: string;
}

export interface UseModerateReviewCtx {
  /** Slug del vendor público para invalidar su ficha (rating_avg/reviews_count refrescos). */
  vendorSlug?: string;
  /** Id del vendor para invalidar el listado admin del vendor (US-066 admin sees-all). */
  vendorId?: string;
}

export function useModerateReview(
  ctx: UseModerateReviewCtx = {},
): ReturnType<typeof useMutation<ModeratedReviewDTO, ApiError, ModerateReviewInput>> {
  const qc = useQueryClient();
  return useMutation<ModeratedReviewDTO, ApiError, ModerateReviewInput>({
    mutationFn: ({ reviewId, action, reason }) =>
      adminReviewsApi.moderate(reviewId, { action, reason }),
    onSuccess: () => {
      // US-077 D5: cualquier `admin.reviews.list.*` queda stale — invalidación por prefijo.
      void qc.invalidateQueries({ queryKey: adminReviewsKeys.all });
      if (ctx.vendorId) {
        void qc.invalidateQueries({ queryKey: ['vendor-reviews', ctx.vendorId] });
      }
      if (ctx.vendorSlug) {
        void qc.invalidateQueries({ queryKey: ['public-vendor', 'detail', ctx.vendorSlug] });
      }
    },
  });
}

// ── list infinite query (US-077) ────────────────────────────────────────────

export interface UseAdminReviewsListOptions {
  enabled?: boolean;
}

export function useAdminReviewsList(
  filters: AdminReviewListFilters,
  { enabled = true }: UseAdminReviewsListOptions = {},
) {
  return useInfiniteQuery<
    AdminReviewsListDTO,
    ApiError,
    InfiniteData<AdminReviewsListDTO, string | undefined>,
    ReturnType<typeof adminReviewsKeys.list>,
    string | undefined
  >({
    queryKey: adminReviewsKeys.list(filters),
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => adminReviewsApi.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => last.pagination.nextCursor ?? undefined,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
