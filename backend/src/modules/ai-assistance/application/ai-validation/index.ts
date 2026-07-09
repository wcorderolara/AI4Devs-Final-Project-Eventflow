// Barrel de la capa de validación de output IA (US-124 / PB-P0-011, ADR-AI-007). Backend-only: sin
// endpoints, sin UI, sin persistencia (US-122), sin timeout/fallback orchestration (US-123).
export type {
  AIValidationMetadata,
  AIOutputValidationResult,
  AIValidationContext,
} from './ai-validation-types.js';
export { AIOutputValidationService, summarizeZodError } from './ai-output-validation.service.js';
export {
  ValidatedAIExecutionService,
  type ValidatedExecutionInput,
  type ValidatedExecutionHandlers,
} from './validated-ai-execution.service.js';
export { parseAIOutput } from './ai-output-parser.js';
export { AI_MAX_OUTPUT_RETRIES, isRetryableOutputError } from './ai-retry-policy.js';
export {
  outputSchemaRef,
  resolveOutputSchemaByFeature,
  resolveOutputSchemaByRef,
  hasOutputSchema,
  type ResolvedOutputSchema,
} from './output-schema-registry.js';
export {
  AI_OUTPUT_VALIDATION_FAILED_EVENT,
  AI_OUTPUT_RETRY_ATTEMPTED_EVENT,
  AI_OUTPUT_VALIDATION_SUCCESS_EVENT,
  AI_OUTPUT_RETRY_EXHAUSTED_EVENT,
  toValidationSafeLogFields,
  logValidationEvent,
  type ValidationSafeLogFields,
} from './ai-validation-logger.js';
