'use client';

// US-025 (PB-P1-016 / FE-003) — Hook TanStack Query para POST `/apply`. El consumidor pasa las
// `invalidateQueryKeys` de la vista origen para refetch tras aplicar (patrón reusable).
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import { hitlApi, type AIRecommendationResponseDto } from '../api/hitlApi';

interface UseApplyArgs {
  aiRecommendationId: string;
  invalidateQueryKeys?: QueryKey[];
}

interface ApplyVars {
  editedPayload?: Record<string, unknown>;
}

export function useApplyAIRecommendation(
  args: UseApplyArgs,
): ReturnType<typeof useMutation<AIRecommendationResponseDto, ApiError, ApplyVars>> {
  const qc = useQueryClient();
  return useMutation<AIRecommendationResponseDto, ApiError, ApplyVars>({
    mutationFn: ({ editedPayload }) =>
      hitlApi.applyRecommendation(args.aiRecommendationId, editedPayload ? { editedPayload } : {}),
    onSuccess: () => {
      for (const key of args.invalidateQueryKeys ?? []) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
