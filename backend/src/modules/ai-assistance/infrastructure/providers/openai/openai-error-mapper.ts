// Normalización de fallas OpenAI a errores tipados del contrato (US-118 / BE-006, AC-06).
// Aislado para test unitario y para evitar leaks de raw response/API key al caller público (SEC-04/SEC-06).
import type { AppError } from '../../../../../shared/domain/errors/app.error.js';
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  AiInvalidOutputError,
  AIProviderNotConfiguredError,
} from '../../../../../shared/domain/errors/ai.errors.js';
import { OpenAIHttpError, OpenAIMalformedResponseError } from './openai-client.js';

/** ¿El error proviene de un `AbortController` (timeout de la llamada)? */
function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/**
 * Traduce cualquier falla a un error tipado del contrato. NO relanza raw response ni secrets:
 * - Ya tipado (config/timeout/unavailable/invalid) → se conserva.
 * - Abort → `AiProviderTimeoutError` (503, consistente con el path AI de US-097; el `AITimeoutError`
 *   →504 de US-093 tiene semántica distinta).
 * - HTTP 401/403/429/5xx/otros y red → `AiProviderUnavailableError` (sin filtrar detalle sensible).
 * - Respuesta sin contenido → `AiInvalidOutputError`.
 */
export function toTypedProviderError(err: unknown): AppError {
  if (
    err instanceof AiProviderTimeoutError ||
    err instanceof AiProviderUnavailableError ||
    err instanceof AiInvalidOutputError ||
    err instanceof AIProviderNotConfiguredError
  ) {
    return err;
  }
  if (isAbortError(err)) {
    return new AiProviderTimeoutError();
  }
  if (err instanceof OpenAIMalformedResponseError) {
    return new AiInvalidOutputError();
  }
  if (err instanceof OpenAIHttpError) {
    // Auth/quota/rate/5xx/otros → provider unavailable. El status no se expone al caller público.
    return new AiProviderUnavailableError('AI provider request failed');
  }
  // Red/timeout de socket/desconocido → unavailable genérico y seguro.
  return new AiProviderUnavailableError();
}
