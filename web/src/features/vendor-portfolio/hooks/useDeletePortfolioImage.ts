'use client';

// Mutation hook — vendor portfolio delete (US-048 / PB-P1-026 / FE-002).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorPortfolioApi } from '../api/vendorPortfolioApi';
import type { DeletePortfolioImageInput } from '../api/vendorPortfolioApi.types';
import { vendorPortfolioKeys } from './useUploadPortfolioImage';

export function useDeletePortfolioImage(): ReturnType<
  typeof useMutation<void, Error, DeletePortfolioImageInput>
> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeletePortfolioImageInput>({
    mutationFn: (input) => vendorPortfolioApi.deletePortfolioImage(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorPortfolioKeys.me() });
    },
  });
}
