// Config de ejecución AI: mapeo desde entorno + validación tipada (US-123 / OPS-001, BE-007).
// Existen DOS caminos de validación de config (Deviation D3):
//   1. `env.ts` superRefine → fail-fast de boot con ZodError (patrón del repo).
//   2. `validateAIExecutionConfig` (aquí) → `AiConfigInvalidError` code `AI_CONFIG_INVALID`, tipado
//      y unit-testeable sin process.env. Ambos aplican las MISMAS reglas de seguridad.
import { AiConfigInvalidError } from '../../../../shared/domain/errors/ai.errors.js';
import type { ProviderId } from '../../ports/ai-contract.js';
import type { AIExecutionConfig } from './ai-execution-types.js';

const APPROVED_PROVIDERS: readonly ProviderId[] = ['openai', 'mock', 'anthropic'];

/** Forma mínima del env necesaria para construir la config de ejecución AI. */
export interface AIExecutionEnv {
  LLM_PROVIDER: ProviderId;
  AI_TIMEOUT_MS: number;
  AI_DEMO_MODE: boolean;
  AI_USE_MOCK_FALLBACK: boolean;
  AI_LOG_PAYLOADS: boolean;
  NODE_ENV: 'development' | 'test' | 'production';
}

/** Mapea el env validado a `AIExecutionConfig`. */
export function readAIExecutionConfig(env: AIExecutionEnv): AIExecutionConfig {
  return {
    llmProvider: env.LLM_PROVIDER,
    timeoutMs: env.AI_TIMEOUT_MS,
    demoMode: env.AI_DEMO_MODE,
    useMockFallback: env.AI_USE_MOCK_FALLBACK,
    logPayloads: env.AI_LOG_PAYLOADS,
    isProduction: env.NODE_ENV === 'production',
  };
}

/**
 * Valida la config AI (AC-07 / VR-01/VR-02 / SEC-04). Lanza `AiConfigInvalidError` en la primera
 * regla violada. No imprime valores secretos (sólo nombre de variable y valores permitidos).
 */
export function validateAIExecutionConfig(config: AIExecutionConfig): void {
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
    throw new AiConfigInvalidError('AI_TIMEOUT_MS must be a positive integer', {
      variable: 'AI_TIMEOUT_MS',
      allowed: 'positive integer (default 60000)',
    });
  }
  if (!APPROVED_PROVIDERS.includes(config.llmProvider)) {
    throw new AiConfigInvalidError('LLM_PROVIDER must be an approved provider', {
      variable: 'LLM_PROVIDER',
      allowed: APPROVED_PROVIDERS.join(' | '),
    });
  }
  // SEC-04: payload logging prohibido en demo/producción.
  if (config.logPayloads && (config.isProduction || config.demoMode)) {
    throw new AiConfigInvalidError('AI_LOG_PAYLOADS=true is forbidden in demo/production', {
      variable: 'AI_LOG_PAYLOADS',
      allowed: 'false in demo-academic and production-academic',
    });
  }
  // AC-03 / VR-04: fallback no puede ser silencioso en producción.
  if (config.isProduction && (config.useMockFallback || config.demoMode)) {
    throw new AiConfigInvalidError('Silent fallback is forbidden in production-academic', {
      variable: config.useMockFallback ? 'AI_USE_MOCK_FALLBACK' : 'AI_DEMO_MODE',
      allowed: 'false in production-academic',
    });
  }
}
