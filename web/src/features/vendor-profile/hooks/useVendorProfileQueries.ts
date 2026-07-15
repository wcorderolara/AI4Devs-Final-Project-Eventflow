'use client';

// Queries de catálogos usadas por el wizard vendor-profile (US-040 / FE-004).
import { useQuery } from '@tanstack/react-query';
import { vendorProfileApi } from '../api/vendorProfileApi';
import type { ServiceCategoryOption } from '../api/vendorProfileApi.types';

export const vendorProfileKeys = {
  serviceCategories: ['vendor-profile', 'service-categories'] as const,
};

export function useServiceCategories(): ReturnType<
  typeof useQuery<ServiceCategoryOption[], Error>
> {
  return useQuery<ServiceCategoryOption[], Error>({
    queryKey: vendorProfileKeys.serviceCategories,
    queryFn: () => vendorProfileApi.listServiceCategories(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
