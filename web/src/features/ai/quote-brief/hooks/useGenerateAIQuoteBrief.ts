'use client';

// Hook TanStack Query para la generación del brief IA (US-021 / FE-001).
import {
  createAIGenerationHook,
  createAIKeys,
} from '@/features/ai/shared/hooks/createAIGenerationHook';
import { aiQuoteBriefApi } from '../api/aiApi';

export const aiQuoteBriefKeys = createAIKeys('quote-brief');

export const useGenerateAIQuoteBrief = createAIGenerationHook(aiQuoteBriefApi, aiQuoteBriefKeys);
