// Provider stub para proveedores reales aún no implementados (US-097). Los adapters OpenAI/Anthropic
// pertenecen a PB-P0-010/011; hasta entonces devuelven AI_PROVIDER_UNAVAILABLE de forma controlada.
import type { LLMProvider, LlmGenerationResult } from '../ports/llm-provider.js';
import { AiProviderUnavailableError } from '../../../shared/domain/errors/ai.errors.js';

export class UnavailableAIProvider implements LLMProvider {
  generate(): Promise<LlmGenerationResult> {
    return Promise.reject(new AiProviderUnavailableError('Real LLM provider not available yet (PB-P0-010/011)'));
  }
}
