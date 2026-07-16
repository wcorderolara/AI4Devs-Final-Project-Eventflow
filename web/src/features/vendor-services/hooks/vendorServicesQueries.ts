'use client';

// Hooks TanStack — vendor-services (US-044 / PB-P1-027 / FE-003).
// Un query key namespace + 1 query (list) + 3 mutations (create, update, deactivate).
// Todas las mutations invalidan el listado para que la tabla refleje el nuevo estado.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { vendorServicesApi } from '../api/vendorServicesApi';
import type {
  CreateVendorServiceInput,
  UpdateVendorServiceInput,
  VendorServiceView,
} from '../api/vendorServicesApi.types';

export const vendorServicesKeys = {
  all: ['vendor', 'services'] as const,
  list: () => [...vendorServicesKeys.all, 'list'] as const,
};

export function useVendorServicesList(): ReturnType<
  typeof useQuery<VendorServiceView[], Error>
> {
  return useQuery<VendorServiceView[], Error>({
    queryKey: vendorServicesKeys.list(),
    queryFn: () => vendorServicesApi.list(),
  });
}

export function useCreateVendorService(): ReturnType<
  typeof useMutation<VendorServiceView, Error, CreateVendorServiceInput>
> {
  const qc = useQueryClient();
  return useMutation<VendorServiceView, Error, CreateVendorServiceInput>({
    mutationFn: (input) => vendorServicesApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorServicesKeys.list() });
    },
  });
}

export function useUpdateVendorService(): ReturnType<
  typeof useMutation<VendorServiceView, Error, { id: string; input: UpdateVendorServiceInput }>
> {
  const qc = useQueryClient();
  return useMutation<VendorServiceView, Error, { id: string; input: UpdateVendorServiceInput }>({
    mutationFn: ({ id, input }) => vendorServicesApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorServicesKeys.list() });
    },
  });
}

export function useDeactivateVendorService(): ReturnType<
  typeof useMutation<void, Error, string>
> {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => vendorServicesApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorServicesKeys.list() });
    },
  });
}
