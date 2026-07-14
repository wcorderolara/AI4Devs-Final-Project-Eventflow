'use client';

// Hook TanStack Query para la generación de la lista IA de categorías (US-020 / FE-001).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api-client';
import {
  aiVendorCategoriesApi,
  type VendorCategoriesInput,
  type GenerateVendorCategoriesResponse,
} from '../api/aiApi';

export const aiVendorCategoriesKeys = {
  all: ['ai', 'vendor-categories'] as const,
  detail: (eventId: string) => ['ai', 'vendor-categories', eventId] as const,
};

interface UseGenerateAIVendorCategoriesParams {
  eventId: string;
  languageCode?: string;
  input: VendorCategoriesInput;
  preferMock?: boolean;
}

export function useGenerateAIVendorCategories(): ReturnType<
  typeof useMutation<GenerateVendorCategoriesResponse, ApiError, UseGenerateAIVendorCategoriesParams>
> {
  const queryClient = useQueryClient();
  return useMutation<GenerateVendorCategoriesResponse, ApiError, UseGenerateAIVendorCategoriesParams>({
    mutationFn: ({ eventId, input, languageCode, preferMock }) =>
      aiVendorCategoriesApi.generate(eventId, { input, languageCode, preferMock }),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(aiVendorCategoriesKeys.detail(variables.eventId), response);
    },
  });
}
