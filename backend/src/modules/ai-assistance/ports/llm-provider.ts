// Puerto LLMProvider (US-097 / AI-001; formalizado en US-117 / PB-P0-009). Backend-only (ADR-SEC/AI).
// Los adapters reales (OpenAI/Anthropic) pertenecen a US-118/US-120; US-097 usa MockAIProvider
// determinista (US-119). Puede lanzar los errores tipados de `shared/domain/errors/ai.errors.ts`
// (AiProviderTimeoutError/AiProviderUnavailableError/AiInvalidOutputError/AIProviderNotConfiguredError);
// el output se valida aparte y el puerto NO decide status HTTP ni persiste errores (AC-05).
//
// US-117: los tipos formales del contrato (`AIContext`, `AIResult<TOutput>`, `ProviderId`,
// `LanguageCode`, `PromptVersionId`) viven en `./ai-contract.ts`. `generate()` es la firma operativa
// entregada por US-097 (dispatch por feature); `provider` se restringe a `ProviderId` (AC-06).
import type { SupportedLanguage } from '../../../shared/constants/languages.js';
import type { AiFeatureType } from '../domain/ai-features.js';
import type { ProviderId, PromptVersionId } from './ai-contract.js';

export interface LlmGenerationResult {
  output: unknown;
  provider: ProviderId;
  /** Alias operativo de `AIResult.promptVersionId` (US-117). */
  promptVersion: PromptVersionId;
  latencyMs: number;
  /**
   * `true` cuando el adapter degradó a un template estático (por error del provider real, timeout
   * o output detectado fuera de idioma). US-084 (PB-P1-049 / BE-003 · AC-05) semántica canónica:
   * este flag se propaga a la columna denormalizada `AIRecommendation.locale_fallback` y al log
   * `ai.locale.fallback`. Mock/direct call → `false`; fallback path del composition layer → `true`.
   */
  fallbackUsed: boolean;
  /** Hash de auditoría del output crudo del provider (US-118 / AC-04). Opcional; sin persistir raw. */
  rawOutputHash?: string;
}

export interface LLMProvider {
  generate(request: {
    feature: AiFeatureType;
    input: Record<string, unknown>;
    /**
     * US-084 (PB-P1-049 / BE-002 · AC-01): idioma obligatorio, tipado sobre la whitelist canónica
     * (`SupportedLanguage`) — no `string` — para que un adapter nuevo no compile si omite el
     * binding. `LanguageCode` (`./ai-contract.ts`) reexporta este mismo tipo.
     */
    languageCode: SupportedLanguage;
    preferMock?: boolean;
  }): Promise<LlmGenerationResult>;
}
