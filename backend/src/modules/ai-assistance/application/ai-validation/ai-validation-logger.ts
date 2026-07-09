// Safe logging de validación de output IA (US-124 / SEC-003, OBS-001, AC-09). WHITELIST de campos:
// nunca raw output, prompt, input payload, secrets ni PII. `schemaErrorSummary` viene truncado.
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import type { AIValidationMetadata } from './ai-validation-types.js';

export const AI_OUTPUT_VALIDATION_FAILED_EVENT = 'ai.output_validation_failed';
export const AI_OUTPUT_RETRY_ATTEMPTED_EVENT = 'ai.output_retry_attempted';
export const AI_OUTPUT_VALIDATION_SUCCESS_EVENT = 'ai.output_validation_success';
export const AI_OUTPUT_RETRY_EXHAUSTED_EVENT = 'ai.output_retry_exhausted';

export interface ValidationSafeLogFields {
  event: string;
  featureType?: string;
  provider?: string;
  schemaName?: string;
  retryCount?: number;
  errorCode?: string;
  schemaErrorSummary?: string;
  correlationId?: string;
}

/** Construye el payload seguro (whitelist) desde la metadata de validación. */
export function toValidationSafeLogFields(event: string, meta: Partial<AIValidationMetadata>): ValidationSafeLogFields {
  return {
    event,
    featureType: meta.featureType,
    provider: meta.provider,
    schemaName: meta.schemaName,
    retryCount: meta.retryCount,
    errorCode: meta.errorCode,
    schemaErrorSummary: meta.schemaErrorSummary,
    correlationId: meta.correlationId,
  };
}

export function logValidationEvent(event: string, meta: Partial<AIValidationMetadata>): void {
  const fields = toValidationSafeLogFields(event, meta);
  if (event === AI_OUTPUT_VALIDATION_SUCCESS_EVENT) {
    logger.info(event, fields);
  } else {
    logger.warn(event, fields);
  }
}
