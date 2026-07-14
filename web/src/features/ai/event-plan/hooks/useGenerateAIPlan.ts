'use client';

// Hook TanStack Query para la generación del plan IA (US-017 / FE-001).
// Devuelve `mutate/mutateAsync`, estados de loading/error y el plan resultante. El componente
// consume `data.output` para renderizar el plan y `data.aiMeta.fallbackUsed` para el badge base.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  aiEventPlanApi,
  type EventPlanInput,
  type GenerateEventPlanResponse,
} from '../api/aiApi';

export const aiEventPlanKeys = {
  all: ['ai', 'event-plan'] as const,
  detail: (eventId: string) => ['ai', 'event-plan', eventId] as const,
};

interface UseGenerateAIPlanParams {
  eventId: string;
  languageCode?: string;
  input: EventPlanInput;
  preferMock?: boolean;
}

export function useGenerateAIPlan(): ReturnType<
  typeof useMutation<GenerateEventPlanResponse, ApiError, UseGenerateAIPlanParams>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateEventPlanResponse, ApiError, UseGenerateAIPlanParams>({
    mutationFn: ({ eventId, input, languageCode, preferMock }) =>
      aiEventPlanApi.generate(eventId, { input, languageCode, preferMock }),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiEventPlanKeys.detail(variables.eventId), response);
    },
  });
}
