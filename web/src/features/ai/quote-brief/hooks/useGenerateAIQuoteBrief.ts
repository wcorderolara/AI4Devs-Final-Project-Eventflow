'use client';

// Hook TanStack Query para la generación del brief IA (US-021 / FE-001).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  aiQuoteBriefApi,
  type QuoteBriefInput,
  type GenerateQuoteBriefResponse,
} from '../api/aiApi';

export const aiQuoteBriefKeys = {
  all: ['ai', 'quote-brief'] as const,
  detail: (eventId: string) => ['ai', 'quote-brief', eventId] as const,
};

interface UseGenerateAIQuoteBriefParams {
  eventId: string;
  languageCode?: string;
  input: QuoteBriefInput;
  preferMock?: boolean;
}

export function useGenerateAIQuoteBrief(): ReturnType<
  typeof useMutation<GenerateQuoteBriefResponse, ApiError, UseGenerateAIQuoteBriefParams>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateQuoteBriefResponse, ApiError, UseGenerateAIQuoteBriefParams>({
    mutationFn: ({ eventId, input, languageCode, preferMock }) =>
      aiQuoteBriefApi.generate(eventId, { input, languageCode, preferMock }),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiQuoteBriefKeys.detail(variables.eventId), response);
    },
  });
}
