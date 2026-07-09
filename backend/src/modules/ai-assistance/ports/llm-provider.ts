// Puerto LLMProvider (US-097 / AI-001). Backend-only (ADR-SEC/AI). Los adapters reales
// (OpenAI/Anthropic) pertenecen a PB-P0-010/011; US-097 usa MockAIProvider determinista.
// Puede lanzar AiProviderTimeoutError/AiProviderUnavailableError; el output se valida aparte.
import type { AiFeatureType } from '../domain/ai-features.js';

export interface LlmGenerationResult {
  output: unknown;
  provider: string;
  promptVersion: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export interface LLMProvider {
  generate(request: {
    feature: AiFeatureType;
    input: Record<string, unknown>;
    languageCode: string;
    preferMock?: boolean;
  }): Promise<LlmGenerationResult>;
}
