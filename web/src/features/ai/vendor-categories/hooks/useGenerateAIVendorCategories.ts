'use client';

// Hook TanStack Query para la generación de la lista IA de categorías (US-020 / FE-001).
import {
  createAIGenerationHook,
  createAIKeys,
} from '@/features/ai/shared/hooks/createAIGenerationHook';
import { aiVendorCategoriesApi } from '../api/aiApi';

export const aiVendorCategoriesKeys = createAIKeys('vendor-categories');

export const useGenerateAIVendorCategories = createAIGenerationHook(
  aiVendorCategoriesApi,
  aiVendorCategoriesKeys,
);
