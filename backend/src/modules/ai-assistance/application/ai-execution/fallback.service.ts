// Elegibilidad de fallback (US-123 / BE-003, AC-02/AC-03/AC-05). Allowlist EXPLÍCITA: el único
// target de fallback permitido es `MockAIProvider` — `anthropic` NUNCA (AC-05, ADR-AI-004).
import type { ProviderId } from '../../ports/ai-contract.js';
import type { AIExecutionConfig } from './ai-execution-types.js';

/** Único target de fallback permitido en MVP. */
export const FALLBACK_ALLOWLIST: readonly ProviderId[] = ['mock'];

export const FallbackService = {
  /**
   * ¿Se permite fallback según config? Sólo con `AI_DEMO_MODE=true` o `AI_USE_MOCK_FALLBACK=true`.
   * En producción ambos flags están forzados a false por config validation (AC-03).
   */
  isFallbackEligible(config: AIExecutionConfig): boolean {
    return config.demoMode || config.useMockFallback;
  },

  /** ¿El provider puede ser target de fallback? Sólo `mock` (bloquea `anthropic`/`openai`). */
  isAllowedFallbackTarget(providerId: ProviderId): boolean {
    return FALLBACK_ALLOWLIST.includes(providerId);
  },
} as const;
