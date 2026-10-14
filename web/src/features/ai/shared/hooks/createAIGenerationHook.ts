'use client';

// Fábrica de hooks TanStack Query para los generadores IA por evento (US-017..US-021 / FE-001).
// La respuesta se cachea en `['ai', <feature>, eventId]` para que el viewer la reutilice.
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import type { AIGenerationResponse, AIGenerator } from '../api/createAIGenerator';

export function createAIKeys<F extends string>(feature: F) {
  return {
    all: ['ai', feature] as const,
    detail: (eventId: string) => ['ai', feature, eventId] as const,
  };
}

export interface AIGenerationParams<I> {
  eventId: string;
  languageCode?: string;
  input: I;
  preferMock?: boolean;
}

export function createAIGenerationHook<I, O>(
  generator: AIGenerator<I, O>,
  keys: { detail: (eventId: string) => readonly unknown[] },
): () => UseMutationResult<AIGenerationResponse<O>, ApiError, AIGenerationParams<I>> {
  return function useGenerateAI() {
    const queryClient = useQueryClient();
    return useMutation<AIGenerationResponse<O>, ApiError, AIGenerationParams<I>>({
      mutationFn: ({ eventId, input, languageCode, preferMock }) =>
        generator.generate(eventId, { input, languageCode, preferMock }),
      onSuccess: (response, variables) => {
        queryClient.setQueryData(keys.detail(variables.eventId), response);
      },
    });
  };
}
