'use client';

import { useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import { organizerMetricsApi, type OrganizerMetricsDTO } from '../api/organizerMetricsApi';

export const organizerMetricsKeys = {
  all: ['organizer', 'metrics'] as const,
  root: () => ['organizer', 'metrics', 'root'] as const,
} as const;

export function useOrganizerMetrics() {
  return useQuery<OrganizerMetricsDTO, ApiError>({
    queryKey: organizerMetricsKeys.root(),
    queryFn: () => organizerMetricsApi.get(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
