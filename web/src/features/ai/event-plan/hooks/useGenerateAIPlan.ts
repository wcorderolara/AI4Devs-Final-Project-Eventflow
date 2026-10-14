'use client';

// Hook TanStack Query para la generación del plan IA (US-017 / FE-001).
// Devuelve `mutate/mutateAsync`, estados de loading/error y el plan resultante. El componente
// consume `data.output` para renderizar el plan y `data.aiMeta.fallbackUsed` para el badge base.
import {
  createAIGenerationHook,
  createAIKeys,
} from '@/features/ai/shared/hooks/createAIGenerationHook';
import { aiEventPlanApi } from '../api/aiApi';

export const aiEventPlanKeys = createAIKeys('event-plan');

export const useGenerateAIPlan = createAIGenerationHook(aiEventPlanApi, aiEventPlanKeys);
