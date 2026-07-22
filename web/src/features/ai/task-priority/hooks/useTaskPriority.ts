'use client';

// Hook TanStack Query — mutación de priorización IA del checklist (US-024 / FE-002).
// Cachea la última respuesta por `eventId` (queryKey `['ai','task-priority', eventId]`) para que
// la card muestre el top más reciente al re-render sin regenerar. El backend administra su propio
// cache por signature 5min: el usuario solo ve `cache_hit=true` cuando nada cambió.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/shared/api-client';
import {
  aiTaskPriorityApi,
  type GenerateTaskPriorityInput,
  type GenerateTaskPriorityResponse,
} from '../api/aiApi';

export const aiTaskPriorityKeys = {
  all: ['ai', 'task-priority'] as const,
  detail: (eventId: string) => ['ai', 'task-priority', eventId] as const,
};

export function useTaskPriority(): ReturnType<
  typeof useMutation<GenerateTaskPriorityResponse, ApiError, GenerateTaskPriorityInput>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateTaskPriorityResponse, ApiError, GenerateTaskPriorityInput>({
    mutationFn: (input) => aiTaskPriorityApi.generate(input),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiTaskPriorityKeys.detail(variables.eventId), response);
    },
  });
}
