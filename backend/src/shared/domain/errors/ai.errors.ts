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
export class AiInvalidOutputError extends AppError {
  readonly code = ErrorCodes.AI_INVALID_OUTPUT; // 422
  constructor(message = 'AI provider returned invalid output') { super(message); }
}
export class InvalidStateTransitionError extends AppError {
  readonly code = ErrorCodes.INVALID_STATE_TRANSITION; // 422
  constructor(message = 'Invalid state transition') { super(message); }
}
export class AiProviderUnavailableError extends AppError {
  readonly code = ErrorCodes.AI_PROVIDER_UNAVAILABLE; // 503
  constructor(message = 'AI provider is unavailable') { super(message); }
}
export class AiProviderTimeoutError extends AppError {
  readonly code = ErrorCodes.AI_PROVIDER_TIMEOUT; // 503 (US-097; distinto del AITimeoutError→504 de US-093)
  constructor(message = 'AI provider timed out') { super(message); }
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
