'use client';

// Hooks TanStack — quotes (US-049 / PB-P1-030 / FE-003).
// Un query key namespace + 1 mutation (createRequest). Invalida el listado de QRs por evento
// (namespace preservado para US futuras que listan QRs desde el organizer).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi } from '../api/quotesApi';
import type { CreateQuoteRequestInput, CreateQuoteRequestView } from '../api/quotesApi.types';
import type { ApiError } from '@/shared/api-client';

export const quotesKeys = {
  all: ['quotes'] as const,
  requestsByEvent: (eventId: string) => [...quotesKeys.all, 'requests', 'by-event', eventId] as const,
};

export function useCreateQuoteRequest(): ReturnType<
  typeof useMutation<CreateQuoteRequestView, ApiError, CreateQuoteRequestInput>
> {
  const qc = useQueryClient();
  return useMutation<CreateQuoteRequestView, ApiError, CreateQuoteRequestInput>({
    mutationFn: (input) => quotesApi.createRequest(input),
    onSuccess: (view) => {
      void qc.invalidateQueries({ queryKey: quotesKeys.requestsByEvent(view.eventId) });
    },
  });
}
