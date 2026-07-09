// AnthropicProvider — stub NO funcional (US-120 / PB-P0-009, ADR-AI-004). Implementa `LLMProvider`
// para demostrar sustituibilidad del puerto, pero falla EXPLÍCITAMENTE en toda invocación con un
// error tipado aprobado (`AIProviderNotConfiguredError`, provider='anthropic'). Sin SDK, sin API key,
// sin red externa, sin prompts, sin output IA y sin fallback (AC-01..08). Ver README.md del directorio.
// Anthropic funcional es Future y requiere nuevo backlog + ADR/PO.
import type { LLMProvider, LlmGenerationResult } from '../../../ports/llm-provider.js';
import type { AiFeatureType } from '../../../domain/ai-features.js';
import { logger } from '../../../../../shared/infrastructure/logger/index.js';
import { AIProviderNotConfiguredError } from '../../../../../shared/domain/errors/ai.errors.js';

interface GenerateRequest {
  feature: AiFeatureType;
  input: Record<string, unknown>;
  languageCode: string;
  preferMock?: boolean;
}

export class AnthropicProvider implements LLMProvider {
  generate(request: GenerateRequest): Promise<LlmGenerationResult> {
    return Promise.reject(this.failNotImplemented(request.feature));
  }

  // Helper común de fallo explícito (US-120 / BE-001). Metadata SEGURA únicamente: sin raw prompt,
  // sin input completo, sin secrets, sin stack público. Log warn ante activación accidental (AC-06).
  private failNotImplemented(feature: AiFeatureType): AIProviderNotConfiguredError {
    const error = new AIProviderNotConfiguredError(
      'Anthropic provider is a non-functional stub in the MVP (not implemented).',
      { provider: 'anthropic', causeCode: 'ANTHROPIC_STUB_NOT_IMPLEMENTED_MVP' },
    );
    logger.warn({
      event: 'ai.provider.not_implemented',
      provider: 'anthropic',
      featureType: feature,
      errorCode: error.code,
    });
    return error;
  }
}
