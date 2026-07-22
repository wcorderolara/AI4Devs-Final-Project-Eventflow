'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import { vendorMetricsApi, type VendorMetricsDTO } from '../api/vendorMetricsApi';

export const vendorMetricsKeys = {
  all: ['vendor', 'metrics'] as const,
  root: () => ['vendor', 'metrics', 'root'] as const,
} as const;

export function useVendorMetrics() {
  return useQuery<VendorMetricsDTO, ApiError>({
    queryKey: vendorMetricsKeys.root(),
    queryFn: () => vendorMetricsApi.get(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
