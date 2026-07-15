'use client';

// Mutations de la feature vendor-profile (US-040 / FE-001). React Query maneja loading/errores.
import { useMutation } from '@tanstack/react-query';
import { vendorProfileApi } from '../api/vendorProfileApi';
import type {
  CreateVendorProfileRequestDTO,
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
