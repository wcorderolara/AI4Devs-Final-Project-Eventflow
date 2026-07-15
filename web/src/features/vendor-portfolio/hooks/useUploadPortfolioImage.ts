'use client';

// Mutation hook — vendor portfolio upload (US-043 / PB-P1-026 / FE-002/FE-003).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorPortfolioApi } from '../api/vendorPortfolioApi';
import type {
  PortfolioImageView,
  UploadPortfolioImageInput,
} from '../api/vendorPortfolioApi.types';

/** Query key namespace del portafolio del vendor. */
export const vendorPortfolioKeys = {
  all: ['vendor', 'portfolio'] as const,
  me: () => [...vendorPortfolioKeys.all, 'me'] as const,
};

export function useUploadPortfolioImage(): ReturnType<
  typeof useMutation<PortfolioImageView, Error, UploadPortfolioImageInput>
> {
  const queryClient = useQueryClient();
  return useMutation<PortfolioImageView, Error, UploadPortfolioImageInput>({
    mutationFn: (input) => vendorPortfolioApi.uploadPortfolioImage(input),
    onSuccess: () => {
      // El listado del portafolio (query key vendorPortfolioKeys.me) lo entrega una US futura.
      // La invalidación queda cableada para que ese consumo re-fetche automáticamente.
      void queryClient.invalidateQueries({ queryKey: vendorPortfolioKeys.me() });
    },
  });
}
