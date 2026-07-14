'use client';

// Hook TanStack Query para la generación de la distribución IA (US-019 / FE-001).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  aiBudgetSuggestionApi,
  type BudgetSuggestionInput,
  type GenerateBudgetSuggestionResponse,
} from '../api/aiApi';

export const aiBudgetSuggestionKeys = {
  all: ['ai', 'budget-suggestion'] as const,
  detail: (eventId: string) => ['ai', 'budget-suggestion', eventId] as const,
};

interface UseGenerateAIBudgetParams {
  eventId: string;
  languageCode?: string;
  input: BudgetSuggestionInput;
  preferMock?: boolean;
}

export function useGenerateAIBudget(): ReturnType<
  typeof useMutation<GenerateBudgetSuggestionResponse, ApiError, UseGenerateAIBudgetParams>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateBudgetSuggestionResponse, ApiError, UseGenerateAIBudgetParams>({
    mutationFn: ({ eventId, input, languageCode, preferMock }) =>
      aiBudgetSuggestionApi.generate(eventId, { input, languageCode, preferMock }),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiBudgetSuggestionKeys.detail(variables.eventId), response);
    },
  });
}
