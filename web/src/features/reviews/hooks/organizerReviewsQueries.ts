'use client';

// Hooks TanStack — organizer reviews (US-065 / PB-P1-038 / FE-003).
// Namespace `reviews.*` con `useCreateReview` (mutation). Al éxito invalida:
//   - el perfil público del vendor (para refrescar `rating_avg`/`reviews_count`
//     denormalizados en la ficha pública), si el caller provee `vendorSlug`.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizerReviewsApi } from '../api/organizerReviewsApi';
import type {
  CreateReviewInput,
  CreateReviewView,
} from '../api/organizerReviewsApi.types';
import type { ApiError } from '@/shared/api-client';

export const reviewsKeys = {
  all: ['reviews'] as const,
} as const;

export interface CreateReviewContext {
  /** Si se provee, tras éxito se invalida `public-vendor.detail(vendorSlug)`. */
  vendorSlug?: string;
}

export function useCreateReview(
  ctx: CreateReviewContext = {},
): ReturnType<typeof useMutation<CreateReviewView, ApiError, CreateReviewInput>> {
  const qc = useQueryClient();
  return useMutation<CreateReviewView, ApiError, CreateReviewInput>({
    mutationFn: (input) => organizerReviewsApi.create(input),
    onSuccess: () => {
      if (ctx.vendorSlug) {
        void qc.invalidateQueries({ queryKey: ['public-vendor', 'detail', ctx.vendorSlug] });
      }
    },
  });
}
