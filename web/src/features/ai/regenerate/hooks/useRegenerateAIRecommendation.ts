'use client';

// Hook TanStack Query — mutación de regeneración cross-cutting (US-026 / FE-002).
// El hook invalida el bucket genérico `['ai-recommendations']` — cada feature-específico (AI
// budget viewer, checklist, quote summary, task priority) suele exponer su propio queryKey; el
// dialog padre puede además invalidar keys concretos vía la callback `onSuccess`.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import {
  aiRegenerateApi,
  type RegenerateAIRecommendationInput,
  type RegenerateAIRecommendationResponse,
} from '../api/aiApi';

export const aiRegenerateKeys = {
  all: ['ai-recommendations'] as const,
  regenerate: (recommendationId: string) =>
    ['ai-recommendations', recommendationId, 'regenerate'] as const,
};

export function useRegenerateAIRecommendation(): ReturnType<
  typeof useMutation<
    RegenerateAIRecommendationResponse,
    ApiError,
    RegenerateAIRecommendationInput
  >
> {
  const queryClient = useQueryClient();
  return useMutation<
    RegenerateAIRecommendationResponse,
    ApiError,
    RegenerateAIRecommendationInput
  >({
    mutationFn: (input) => aiRegenerateApi.regenerate(input),
    onSuccess: () => {
      // Invalida el bucket genérico. Las features que necesiten refresh específico deben
      // invalidar sus queryKeys propios en su `onSuccess` del `AIRegenerateDialog`.
      queryClient.invalidateQueries({ queryKey: aiRegenerateKeys.all });
    },
  });
}
