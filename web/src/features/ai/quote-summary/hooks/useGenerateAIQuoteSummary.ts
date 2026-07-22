'use client';

// Hook TanStack Query — mutación de generación IA del comparador de Quotes (US-022 / FE-003).
// Cachea la última respuesta por `(eventId, categoryCode)` para que el panel muestre el resumen
// más reciente al reabrir sin regenerar (evita cost/latencia). El banner de snapshot mismatch
// (FE-004) usa `data.quote_ids_snapshot` vs. los quote_id actuales del comparador.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import {
  aiQuoteSummaryApi,
  type GenerateQuoteSummaryInput,
  type GenerateQuoteSummaryResponse,
} from '../api/aiApi';

export const aiQuoteSummaryKeys = {
  all: ['ai', 'quote-summary'] as const,
  detail: (eventId: string, categoryCode: string) =>
    ['ai', 'quote-summary', eventId, categoryCode] as const,
};

export function useGenerateAIQuoteSummary(): ReturnType<
  typeof useMutation<GenerateQuoteSummaryResponse, ApiError, GenerateQuoteSummaryInput>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateQuoteSummaryResponse, ApiError, GenerateQuoteSummaryInput>({
    mutationFn: (input) => aiQuoteSummaryApi.generate(input),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        aiQuoteSummaryKeys.detail(variables.eventId, variables.categoryCode),
        response,
      );
    },
  });
}
