// Config backend-only de OpenAIProvider (US-118 / BE-001, AC-02). Valida presencia de API key y
// model cuando `LLM_PROVIDER=openai`; ante ausencia lanza AIProviderNotConfiguredError SIN imprimir
// el valor del secreto (SEC-02/SEC-04, EC-01). `AI_TIMEOUT_MS` provee el default de timeout (VR-03).
import { AIProviderNotConfiguredError } from '../../../../../shared/domain/errors/ai.errors.js';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

/** Fuente de config (subset de AppConfig); inyectable para tests sin process.env global. */
export interface OpenAIConfigSource {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_BASE_URL?: string;
  AI_TIMEOUT_MS: number;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * Resuelve y valida la config de OpenAI. `LLM_PROVIDER=openai` exige `OPENAI_API_KEY` y
 * `OPENAI_MODEL` (VR-01/VR-02). Los mensajes de error no incluyen el valor del secreto.
 */
export function resolveOpenAIConfig(source: OpenAIConfigSource): OpenAIConfig {
  const apiKey = source.OPENAI_API_KEY?.trim();
  const model = source.OPENAI_MODEL?.trim();
  if (!apiKey) {
    throw new AIProviderNotConfiguredError('OPENAI_API_KEY is required when LLM_PROVIDER=openai', {
      provider: 'openai',
      causeCode: 'MISSING_API_KEY',
    });
  }
  if (!model) {
    throw new AIProviderNotConfiguredError('OPENAI_MODEL is required when LLM_PROVIDER=openai', {
      provider: 'openai',
      causeCode: 'MISSING_MODEL',
    });
  }
  const timeoutMs = Number.isInteger(source.AI_TIMEOUT_MS) && source.AI_TIMEOUT_MS > 0 ? source.AI_TIMEOUT_MS : 60_000;
  const baseUrl = source.OPENAI_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return { apiKey, model, baseUrl, timeoutMs };
}
