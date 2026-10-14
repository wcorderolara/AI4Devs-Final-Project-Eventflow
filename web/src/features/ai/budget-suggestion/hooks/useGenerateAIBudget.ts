'use client';

// Hook TanStack Query para la generación de la distribución IA (US-019 / FE-001).
import {
  createAIGenerationHook,
  createAIKeys,
} from '@/features/ai/shared/hooks/createAIGenerationHook';
import { aiBudgetSuggestionApi } from '../api/aiApi';

export const aiBudgetSuggestionKeys = createAIKeys('budget-suggestion');

export const useGenerateAIBudget = createAIGenerationHook(
  aiBudgetSuggestionApi,
  aiBudgetSuggestionKeys,
);
