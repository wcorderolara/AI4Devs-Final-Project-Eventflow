'use client';

// Mutations de la feature vendor-profile (US-040 / FE-001; US-041 / FE-001; US-042 / FE-002).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorProfileApi } from '../api/vendorProfileApi';
import { vendorProfileKeys } from './useVendorProfileQueries';
import type {
  ChangeVendorCategoriesRequestDTO,
  ChangeVendorCategoriesResultDTO,
  CreateVendorProfileRequestDTO,
  UpdateVendorProfileRequestDTO,
  UpdateVendorProfileResultDTO,
  VendorProfileDTO,
} from '../api/vendorProfileApi.types';

export function useCreateVendorProfile(): ReturnType<
  typeof useMutation<VendorProfileDTO, Error, CreateVendorProfileRequestDTO>
> {
  return useMutation<VendorProfileDTO, Error, CreateVendorProfileRequestDTO>({
    mutationFn: (input) => vendorProfileApi.create(input),
    retry: false,
  });
}

export function useUpdateVendorProfile(): ReturnType<
  typeof useMutation<UpdateVendorProfileResultDTO, Error, UpdateVendorProfileRequestDTO>
> {
  return useMutation<UpdateVendorProfileResultDTO, Error, UpdateVendorProfileRequestDTO>({
    mutationFn: (input) => vendorProfileApi.update(input),
    retry: false,
  });
}

export function useSoftDeleteVendorProfile(): ReturnType<typeof useMutation<void, Error, void>> {
  return useMutation<void, Error, void>({
    mutationFn: () => vendorProfileApi.softDelete(),
    retry: false,
  });
}

export function useChangeVendorCategories(): ReturnType<
  typeof useMutation<
    ChangeVendorCategoriesResultDTO,
    Error,
    ChangeVendorCategoriesRequestDTO
  >
> {
  const queryClient = useQueryClient();
  return useMutation<
    ChangeVendorCategoriesResultDTO,
    Error,
    ChangeVendorCategoriesRequestDTO
  >({
    mutationFn: (input) => vendorProfileApi.changeCategories(input),
    retry: false,
    onSuccess: () => {
      // Invalida la query `vendor.me` para que próximas lecturas del editor traigan el set
      // fresco tras la re-pending (US-042 AC-01..04).
      void queryClient.invalidateQueries({ queryKey: vendorProfileKeys.me });
    },
  });
}
