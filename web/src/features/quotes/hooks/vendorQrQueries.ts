'use client';

// Hooks TanStack — vendor QR (US-051 / PB-P1-031 / FE-001).
// `useVendorQrDetail(id)` + `useMarkVendorQrViewed(id)`. La orquestación GET → POST se aplica
// en el componente detalle: `useEffect` dispara la mutation cuando `data.status === 'sent'`.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  vendorQrApi,
  type RespondVendorQrInput,
  type VendorQuoteRequestDTO,
  type VendorQuoteResponseDTO,
} from '../api/vendorQrApi';
import type { ApiError } from '@/shared/api-client';

export const vendorQrKeys = {
  all: ['vendor-qr'] as const,
  detail: (id: string) => [...vendorQrKeys.all, 'detail', id] as const,
};

export function useVendorQrDetail(
  id: string,
): ReturnType<typeof useQuery<VendorQuoteRequestDTO, ApiError>> {
  return useQuery<VendorQuoteRequestDTO, ApiError>({
    queryKey: vendorQrKeys.detail(id),
    queryFn: () => vendorQrApi.detail(id),
    enabled: Boolean(id),
    staleTime: 5_000,
    // No refetch en focus para no re-disparar el POST mark-viewed por accidente.
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // No reintentar en 401/403/404 — son estados terminales para el detalle vendor.
      if (error.status === 401 || error.status === 403 || error.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useRespondVendorQr(
  id: string,
): ReturnType<typeof useMutation<VendorQuoteResponseDTO, ApiError, RespondVendorQrInput>> {
  const qc = useQueryClient();
  return useMutation<VendorQuoteResponseDTO, ApiError, RespondVendorQrInput>({
    mutationFn: (input) => vendorQrApi.respond(id, input),
    onSuccess: () => {
      // Al responder, el QR transiciona a `responded` — invalidar el detalle para reflejar el
      // nuevo status en la vista.
      void qc.invalidateQueries({ queryKey: vendorQrKeys.detail(id) });
    },
  });
}

export function useMarkVendorQrViewed(
  id: string,
): ReturnType<typeof useMutation<VendorQuoteRequestDTO, ApiError, void>> {
  const qc = useQueryClient();
  return useMutation<VendorQuoteRequestDTO, ApiError, void>({
    mutationFn: () => vendorQrApi.markViewed(id),
    onSuccess: (view) => {
      // Alinear la cache del detail con la respuesta autoritativa del POST (evita segundo GET).
      qc.setQueryData<VendorQuoteRequestDTO>(vendorQrKeys.detail(id), view);
    },
  });
}
