'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import { adminSeedApi } from '../api/adminSeedApi';
import type { SeedResetInput, SeedResetReportDTO, SeedStatusDTO } from '../api/adminSeedApi.types';

export const adminSeedKeys = {
  all: ['admin', 'seed'] as const,
  status: () => ['admin', 'seed', 'status'] as const,
} as const;

export function useSeedStatus() {
  return useQuery<SeedStatusDTO, ApiError>({
    queryKey: adminSeedKeys.status(),
    queryFn: () => adminSeedApi.status(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useSeedReset() {
  const qc = useQueryClient();
  return useMutation<SeedResetReportDTO, ApiError, SeedResetInput>({
    mutationFn: (input) => adminSeedApi.reset(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminSeedKeys.all });
      // Invalidar métricas: el reset cambia los counts globales.
      void qc.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      // Los listados de admin también quedan stale.
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
  });
}
