'use client';

// Hook TanStack Query para la generación del checklist IA (US-018 / FE-001).
import {
  createAIGenerationHook,
  createAIKeys,
} from '@/features/ai/shared/hooks/createAIGenerationHook';
import { aiChecklistApi } from '../api/aiApi';

export const aiChecklistKeys = createAIKeys('checklist');

export const useGenerateAIChecklist = createAIGenerationHook(aiChecklistApi, aiChecklistKeys);
