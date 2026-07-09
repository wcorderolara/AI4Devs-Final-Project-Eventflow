// Errores del contrato AI endpoints (US-097 / BE / AI-002). Doc 16 §Error Handling.
import { AppError } from './app.error.js';
import { ErrorCodes } from './error-codes.js';

export class MissingInputError extends AppError {
  readonly code = ErrorCodes.MISSING_INPUT; // 400
  constructor(message = 'Required feature input is missing') { super(message); }
}
export class UnsupportedLanguageError extends AppError {
  readonly code = ErrorCodes.UNSUPPORTED_LANGUAGE; // 422
  constructor(message = 'Unsupported language') { super(message); }
}
// US-124 (PB-P0-011): metadata SEGURA de validación de output adjunta a errores. NUNCA raw output,
// prompt completo, input payload, secrets ni PII. `schemaErrorSummary` debe venir truncado/bounded.
export interface AiOutputValidationErrorMeta {
  featureType?: string;
  provider?: string;
  schemaName?: string;
  retryCount?: number;
  schemaErrorSummary?: string;
  correlationId?: string;
}

export class AiInvalidOutputError extends AppError {
  readonly code = ErrorCodes.AI_INVALID_OUTPUT; // 422
  // US-124: acepta metadata de validación opcional (backward-compatible con US-097).
  constructor(message = 'AI provider returned invalid output', readonly meta?: AiOutputValidationErrorMeta) { super(message); }
}

// US-124 (PB-P0-011 / BE-001): errores específicos de parsing/schema/retry de output IA.
/** El output no cumple el schema Zod strict del feature (VR-02 / EC-02/EC-03). */
export class AiInvalidOutputSchemaError extends AppError {
  readonly code = ErrorCodes.AI_INVALID_OUTPUT_SCHEMA; // 422
  constructor(message = 'AI output failed strict schema validation', readonly meta?: AiOutputValidationErrorMeta) { super(message); }
}
/** El output no pudo parsearse (JSON malformado o contenido no-JSON) (VR-01 / EC-01). */
export class AiOutputParseError extends AppError {
  readonly code = ErrorCodes.AI_OUTPUT_PARSE_ERROR; // 422
  constructor(message = 'AI output could not be parsed', readonly meta?: AiOutputValidationErrorMeta) { super(message); }
}
/** Se intentó reintentar más de una vez (VR-04); guard defensivo. */
export class AiRetryLimitExceededError extends AppError {
  readonly code = ErrorCodes.AI_RETRY_LIMIT_EXCEEDED; // 422
  constructor(message = 'AI output retry limit exceeded', readonly meta?: AiOutputValidationErrorMeta) { super(message); }
}
export class InvalidStateTransitionError extends AppError {
  readonly code = ErrorCodes.INVALID_STATE_TRANSITION; // 422
  constructor(message = 'Invalid state transition') { super(message); }
}
// US-123 (PB-P0-011): metadata SEGURA de ejecución AI adjunta a errores controlados de la capa de
// timeout/fallback, para que persistencia/observabilidad downstream (US-122) puedan usarla (AC-06).
// NUNCA prompt completo, input/output crudo, secrets, tokens ni stack.
export interface AiExecutionErrorMeta {
  featureType?: string;
  provider?: string;
  originalProvider?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  timeoutMs?: number;
  latencyMs?: number;
  originalErrorCode?: string;
  correlationId?: string;
}

export class AiProviderUnavailableError extends AppError {
  readonly code = ErrorCodes.AI_PROVIDER_UNAVAILABLE; // 503
  // US-123: acepta metadata de ejecución opcional (backward-compatible con US-097).
  constructor(message = 'AI provider is unavailable', readonly meta?: AiExecutionErrorMeta) { super(message); }
}
export class AiProviderTimeoutError extends AppError {
  readonly code = ErrorCodes.AI_PROVIDER_TIMEOUT; // 503 (US-097; distinto del AITimeoutError→504 de US-093)
  // US-123: acepta metadata de ejecución opcional (backward-compatible con US-097).
  constructor(message = 'AI provider timed out', readonly meta?: AiExecutionErrorMeta) { super(message); }
}

// US-123 (PB-P0-011 / BE-004): errores controlados de la capa de ejecución AI (timeout/fallback).
/** Fallback deshabilitado por config/environment (AC-03 / VR-04). */
export class AiFallbackNotAllowedError extends AppError {
  readonly code = ErrorCodes.AI_FALLBACK_NOT_ALLOWED;
  constructor(message = 'AI fallback is not allowed in this configuration', readonly meta?: AiExecutionErrorMeta) { super(message); }
}
/** El MockAIProvider usado como fallback también falló (EC-05); sin loop, sin Anthropic. */
export class AiFallbackFailedError extends AppError {
  readonly code = ErrorCodes.AI_FALLBACK_FAILED;
  constructor(message = 'AI fallback provider failed', readonly meta?: AiExecutionErrorMeta) { super(message); }
}
/** Configuración AI inválida/insegura detectada en bootstrap (AC-07 / EC-04). */
export class AiConfigInvalidError extends AppError {
  readonly code = ErrorCodes.AI_CONFIG_INVALID;
  constructor(message = 'AI configuration is invalid', readonly meta?: { variable?: string; allowed?: string }) { super(message); }
}

// US-117 (PB-P0-009 / BE-004, AC-05): provider LLM sin configuración válida (p. ej. adapter real
// sin API key/model). Sin dependencia HTTP; el mapping a 503 ocurre en errorHandlerMiddleware.
// Acepta metadata SEGURA opcional (nunca secrets, raw prompts/outputs, cookies, tokens ni stack).
export interface AiProviderErrorMeta {
  provider?: string; // el caller pasa un `ProviderId` (ai-assistance); tipado como string para no
  correlationId?: string; // acoplar el shared kernel al módulo de feature (dirección de capas).
  promptVersionId?: string;
  causeCode?: string;
}
export class AIProviderNotConfiguredError extends AppError {
  readonly code = ErrorCodes.AI_PROVIDER_NOT_CONFIGURED; // 503
  constructor(message = 'AI provider is not configured', readonly meta?: AiProviderErrorMeta) { super(message); }
}
