'use client';

// US-079 (PB-P1-045) / FE-003 — Hook TanStack para el dashboard admin.
// `staleTime: 60_000` alineado con el TTL server-side (Decisión PO D3, Tech Spec §7).
// `RefreshButton` invoca `refetch()` para forzar un cache miss server (US-079 / FE-004).
import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import { adminMetricsApi } from '../api/adminMetricsApi';
import type { AdminMetricsDTO } from '../api/adminMetricsApi.types';

export const adminMetricsKeys = {
  all: ['admin', 'metrics'] as const,
  root: () => ['admin', 'metrics', 'root'] as const,
} as const;

export function useAdminMetrics() {
  return useQuery<AdminMetricsDTO, ApiError>({
    queryKey: adminMetricsKeys.root(),
    queryFn: () => adminMetricsApi.get(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
