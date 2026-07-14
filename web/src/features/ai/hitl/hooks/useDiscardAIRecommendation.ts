'use client';

// US-025 (PB-P1-016 / FE-003) — Hook TanStack Query para POST `/discard`.
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import { hitlApi } from '../api/hitlApi';

interface UseDiscardArgs {
  aiRecommendationId: string;
  invalidateQueryKeys?: QueryKey[];
}

export function useDiscardAIRecommendation(
  args: UseDiscardArgs,
): ReturnType<typeof useMutation<void, ApiError, void>> {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => hitlApi.discardRecommendation(args.aiRecommendationId),
    onSuccess: () => {
      for (const key of args.invalidateQueryKeys ?? []) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
