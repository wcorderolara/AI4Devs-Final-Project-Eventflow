'use client';

// Queries de la feature vendor-profile (US-040 / FE-004; US-041 / FE-002).
import { useQuery } from '@tanstack/react-query';
import { vendorProfileApi } from '../api/vendorProfileApi';
import type {
  ServiceCategoryOption,
  VendorProfileDTO,
} from '../api/vendorProfileApi.types';

export const vendorProfileKeys = {
  serviceCategories: ['vendor-profile', 'service-categories'] as const,
  me: ['vendor-profile', 'me'] as const,
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

export function useMyVendorProfile(): ReturnType<typeof useQuery<VendorProfileDTO, Error>> {
  return useQuery<VendorProfileDTO, Error>({
    queryKey: vendorProfileKeys.me,
    queryFn: () => vendorProfileApi.getMine(),
    retry: false,
    staleTime: 0,
  });
}
