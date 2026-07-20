'use client';

// Hooks TanStack — admin moderate review (US-067 / PB-P1-040 / FE-003).
//
// `useModerateReview(vendorId?)` expone la mutation. Al éxito invalida:
//   - la lista admin de reviews del vendor (cache US-066 admin sees-all) para refrescar los
//     status en la tabla admin sin recargar la página.
//   - el perfil público del vendor (cambia `rating_avg`/`reviews_count` denormalizados —
//     AC-04 recálculo total en backend).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminReviewsApi } from '../api/adminReviewsApi';
import type {
  ModerateReviewBodyDTO,
  ModeratedReviewDTO,
} from '../api/adminReviewsApi.types';
import type { ApiError } from '@/shared/api-client';

export const adminReviewsKeys = {
  all: ['admin', 'reviews'] as const,
  vendor: (vendorId: string) => ['admin', 'reviews', 'vendor', vendorId] as const,
} as const;

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
      if (ctx.vendorId) {
        void qc.invalidateQueries({ queryKey: adminReviewsKeys.vendor(ctx.vendorId) });
        // Paridad US-066 cache: la lista `vendor-reviews` del vendor también refresca porque el
        // avg/count denormalizado en su perfil cambió.
        void qc.invalidateQueries({ queryKey: ['vendor-reviews', ctx.vendorId] });
      }
      if (ctx.vendorSlug) {
        void qc.invalidateQueries({ queryKey: ['public-vendor', 'detail', ctx.vendorSlug] });
      }
    },
  });
}
