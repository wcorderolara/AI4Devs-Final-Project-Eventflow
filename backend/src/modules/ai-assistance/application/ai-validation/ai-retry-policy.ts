// Retry policy de output IA (US-124 / BE-004, AC-03/AC-04). Retry MÁXIMO 1 y SÓLO para fallas de
// parse/schema (`AIInvalidOutputError`/`AiInvalidOutputSchemaError`/`AiOutputParseError`). Los errores
// de timeout/provider (US-123) NO son retriables aquí: se delegan a US-123 (se propagan tal cual).
import {
  AiInvalidOutputError,
  AiInvalidOutputSchemaError,
  AiOutputParseError,
} from '../../../../shared/domain/errors/ai.errors.js';

/** Retry máximo permitido para output inválido (VR-04). */
export const AI_MAX_OUTPUT_RETRIES = 1;

/**
 * ¿El error justifica un retry de validación? Sólo parse/schema failures. Timeout, provider
 * unavailable, not configured, auth, rate-limit y 5xx → `false` (delegados a US-123).
 */
export function isRetryableOutputError(err: unknown): boolean {
  return (
    err instanceof AiInvalidOutputError ||
    err instanceof AiInvalidOutputSchemaError ||
    err instanceof AiOutputParseError
  );
}
