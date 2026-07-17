'use client';

// Hooks TanStack — quotes (US-049 / US-050 / PB-P1-030 / FE-003 + FE-001).
// Namespace `quotes.*` con: `useCreateQuoteRequest` (mutation) + `useActiveQrCount` (query).
// La mutation invalida el `active-count` de `(eventId, serviceCategoryId)` para refrescar el
// badge inmediatamente tras el envío exitoso (D5 pre-check híbrido).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotesApi } from '../api/quotesApi';
import type {
  ActiveQrCountInput,
  ActiveQrCountView,
  CompareQuotesInput,
  CompareQuotesView,
  CreateQuoteRequestInput,
  CreateQuoteRequestView,
} from '../api/quotesApi.types';
import type { ApiError } from '@/shared/api-client';

export const quotesKeys = {
  all: ['quotes'] as const,
  requestsByEvent: (eventId: string) => [...quotesKeys.all, 'requests', 'by-event', eventId] as const,
  activeCount: (eventId: string, serviceCategoryId: string) =>
    [...quotesKeys.all, 'active-count', eventId, serviceCategoryId] as const,
  // US-057 (FE-003): comparador por (event, categoryCode).
  compare: (eventId: string, categoryCode: string) =>
    [...quotesKeys.all, 'compare', eventId, categoryCode] as const,
};

export function useCreateQuoteRequest(): ReturnType<
  typeof useMutation<CreateQuoteRequestView, ApiError, CreateQuoteRequestInput>
> {
  const qc = useQueryClient();
  return useMutation<CreateQuoteRequestView, ApiError, CreateQuoteRequestInput>({
    mutationFn: (input) => quotesApi.createRequest(input),
    onSuccess: (view) => {
      void qc.invalidateQueries({ queryKey: quotesKeys.requestsByEvent(view.eventId) });
      // US-050 D5: invalidar el conteo de la (event, category) para refrescar el badge.
      void qc.invalidateQueries({
        queryKey: quotesKeys.activeCount(view.eventId, view.serviceCategoryId),
      });
    },
  });
}

export function useActiveQrCount(
  input: Partial<ActiveQrCountInput>,
): ReturnType<typeof useQuery<ActiveQrCountView, ApiError>> {
  const enabled = Boolean(input.eventId && input.serviceCategoryId);
  return useQuery<ActiveQrCountView, ApiError>({
    // Cuando `enabled=false` los IDs pueden ser undefined; se materializan sólo cuando ambos
    // están disponibles. El namespace se mantiene consistente con `quotesKeys.activeCount`.
    queryKey: quotesKeys.activeCount(input.eventId ?? '__no_event__', input.serviceCategoryId ?? '__no_cat__'),
    queryFn: () =>
      quotesApi.activeCount({
        eventId: input.eventId as string,
        serviceCategoryId: input.serviceCategoryId as string,
      }),
    enabled,
    staleTime: 10_000, // consistente con Cache-Control corto sugerido por Tech Spec §5 API.
  });
}

/**
 * US-057 (FE-003): comparador de Quotes por `(eventId, categoryCode)`. Sólo dispara la query
 * cuando ambos parámetros están presentes; el `categoryCode` vacío provocaría `400 INVALID_FILTERS`
 * server-side (defensa en profundidad).
 */
export function useCompareQuotes(
  input: Partial<CompareQuotesInput>,
): ReturnType<typeof useQuery<CompareQuotesView, ApiError>> {
  const enabled = Boolean(input.eventId && input.categoryCode);
  return useQuery<CompareQuotesView, ApiError>({
    queryKey: quotesKeys.compare(input.eventId ?? '__no_event__', input.categoryCode ?? '__no_cat__'),
    queryFn: () =>
      quotesApi.compare({
        eventId: input.eventId as string,
        categoryCode: input.categoryCode as string,
      }),
    enabled,
    staleTime: 30_000,
  });
}
