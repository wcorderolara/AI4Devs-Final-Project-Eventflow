// Barrel de la capa de ejecución AI (US-123 / PB-P0-011). Backend-only: sin endpoints, sin UI,
// sin persistencia (US-122), sin JSON validation/retry (US-124).
export type {
  AIExecutionInput,
  AIExecutionMetadata,
  AIExecutionResult,
  AIExecutionStatus,
  AIExecutionConfig,
} from './ai-execution-types.js';
export { AIExecutionService, type AIExecutionServiceDeps } from './ai-execution.service.js';
export { withTimeout, type TimeoutOptions } from './ai-timeout.service.js';
export { FallbackService, FALLBACK_ALLOWLIST } from './fallback.service.js';
export {
  readAIExecutionConfig,
  validateAIExecutionConfig,
  type AIExecutionEnv,
} from './ai-execution-config.js';
export {
  AI_PROVIDER_TIMEOUT_EVENT,
  AI_PROVIDER_FAILURE_EVENT,
  AI_FALLBACK_USED_EVENT,
  AI_FALLBACK_FAILED_EVENT,
  AI_CONFIG_INVALID_EVENT,
  toSafeLogFields,
  logAIExecutionEvent,
  type AISafeLogFields,
} from './ai-execution-logger.js';
