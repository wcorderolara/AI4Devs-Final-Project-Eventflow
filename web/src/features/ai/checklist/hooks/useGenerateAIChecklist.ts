'use client';

// Hook TanStack Query para la generación del checklist IA (US-018 / FE-001).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  aiChecklistApi,
  type ChecklistInput,
  type GenerateChecklistResponse,
} from '../api/aiApi';

export const aiChecklistKeys = {
  all: ['ai', 'checklist'] as const,
  detail: (eventId: string) => ['ai', 'checklist', eventId] as const,
};

interface UseGenerateAIChecklistParams {
  eventId: string;
  languageCode?: string;
  input: ChecklistInput;
  preferMock?: boolean;
}

export function useGenerateAIChecklist(): ReturnType<
  typeof useMutation<GenerateChecklistResponse, ApiError, UseGenerateAIChecklistParams>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateChecklistResponse, ApiError, UseGenerateAIChecklistParams>({
    mutationFn: ({ eventId, input, languageCode, preferMock }) =>
      aiChecklistApi.generate(eventId, { input, languageCode, preferMock }),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiChecklistKeys.detail(variables.eventId), response);
    },
  });
}
