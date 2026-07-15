'use client';

// Mutations de la feature vendor-profile (US-040 / FE-001; US-041 / FE-001).
import { useMutation } from '@tanstack/react-query';
import { vendorProfileApi } from '../api/vendorProfileApi';
import type {
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
