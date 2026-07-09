// Safe logging de la capa de ejecución AI (US-123 / SEC-002, OBS-001, AC-08). WHITELIST de campos:
// nunca prompt completo, input/output crudo, secrets, tokens, cookies ni PII. Reusa el logger
// shared (que además pasa todo por `redact()`).
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import type { AIExecutionMetadata } from './ai-execution-types.js';

export const AI_PROVIDER_TIMEOUT_EVENT = 'ai.provider.timeout';
export const AI_PROVIDER_FAILURE_EVENT = 'ai.provider.failure';
export const AI_FALLBACK_USED_EVENT = 'ai.fallback_used';
export const AI_FALLBACK_FAILED_EVENT = 'ai.fallback_failed';
export const AI_CONFIG_INVALID_EVENT = 'ai.config.invalid';

/** Campos seguros permitidos en logs de ejecución AI (whitelist explícita, AC-08). */
export interface AISafeLogFields {
  event: string;
  featureType?: string;
  provider?: string;
  originalProvider?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  timeoutMs?: number;
  latencyMs?: number;
  errorCode?: string;
  correlationId?: string;
}

/** Extrae SÓLO campos seguros de la metadata (whitelist), descartando cualquier otro. */
export function toSafeLogFields(event: string, meta: Partial<AIExecutionMetadata> & { errorCode?: string }): AISafeLogFields {
  return {
    event,
    featureType: meta.featureType,
    provider: meta.provider,
    originalProvider: meta.originalProvider,
    fallbackUsed: meta.fallbackUsed,
    fallbackReason: meta.fallbackReason,
    timeoutMs: meta.timeoutMs,
    latencyMs: meta.latencyMs,
    errorCode: meta.errorCode ?? meta.originalErrorCode,
    correlationId: meta.correlationId,
  };
}

export function logAIExecutionEvent(event: string, meta: Partial<AIExecutionMetadata> & { errorCode?: string }): void {
  const fields = toSafeLogFields(event, meta);
  if (event === AI_FALLBACK_USED_EVENT) {
    logger.info(event, fields);
  } else {
    logger.warn(event, fields);
  }
}
