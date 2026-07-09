// Barrel de puertos de ai-assistance (US-117 / BE-005). Path de import estable para adapters
// futuros (US-118/119/120) sin filtrar detalles de Infrastructure. Application/Ports exporta
// contratos; Infrastructure los consume.
export type {
  ProviderId,
  LanguageCode,
  PromptVersionId,
  AIContext,
  AIResult,
} from './ai-contract.js';
export type { LLMProvider, LlmGenerationResult } from './llm-provider.js';
export type { AIRecommendationRepository } from './ai-recommendation.repository.js';
