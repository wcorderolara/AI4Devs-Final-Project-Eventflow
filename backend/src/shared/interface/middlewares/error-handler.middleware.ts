// errorHandlerMiddleware (US-091 / BE-003; reescrito en US-093 / BE-006, Global — último, 4 args).
// ADR-API-002; ADR-SEC-006; AC-01/AC-03/AC-05; EC-02/EC-04.
// Captura cualquier error, lo mapea a HTTP + código de catálogo, y serializa el error envelope
// ANIDADO `{ error: { code, message, details?, correlationId } }`. Nunca expone stack/SQL/paths al
// cliente. Loguea 4xx a `warn` y 5xx a `error` (con stack). Masking 403→404 para recursos privados.
import type { ErrorRequestHandler } from 'express';
import { AppError } from '../../domain/errors/app.error.js';
import { ValidationError } from '../../domain/errors/validation.error.js';
import { AuthenticationError } from '../../domain/errors/authentication.error.js';
import { AuthorizationError } from '../../domain/errors/authorization.error.js';
import { NotFoundError } from '../../domain/errors/not-found.error.js';
import { ConflictError } from '../../domain/errors/conflict.error.js';
import { EmailTakenError } from '../../domain/errors/email-taken.error.js';
import { CurrencyImmutableError } from '../../domain/errors/currency-immutable.error.js';
import {
  MaxQuoteRequestsExceededError,
  DuplicateQuoteRequestActiveError,
  QuoteExpiredError,
} from '../../domain/errors/quote-flow.errors.js';
import {
  MissingInputError,
  UnsupportedLanguageError,
  AiInvalidOutputError,
  InvalidStateTransitionError,
  AiProviderUnavailableError,
  AiProviderTimeoutError,
  AIProviderNotConfiguredError,
} from '../../domain/errors/ai.errors.js';
import { BusinessRuleViolationError } from '../../domain/errors/business-rule-violation.error.js';
import { RateLimitError } from '../../domain/errors/rate-limit.error.js';
import { BadRequestError } from '../../domain/errors/bad-request.error.js';
import { SeedResetInProgressError, SeedResetFailedError } from '../../domain/errors/seed-demo.errors.js';
import { AITimeoutError } from '../../domain/errors/ai-timeout.error.js';
import { AIProviderError } from '../../domain/errors/ai-provider.error.js';
import { PrismaPersistenceError } from '../../domain/errors/prisma-persistence.error.js';
import { InfrastructureError } from '../../domain/errors/infrastructure.error.js';
import { ErrorCodes } from '../../domain/errors/error-codes.js';
import type { ErrorDetail } from '../../response/types.js';
import { logger } from '../../infrastructure/logger/index.js';

/** Tipos de error de body-parser (express.json) que deben mapearse a 400. */
const BODY_PARSER_ERROR_TYPES = new Set([
  'entity.too.large',
  'entity.parse.failed',
  'encoding.unsupported',
  'request.aborted',
]);

interface MappedError {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
  masked?: boolean;
  retryAfterSeconds?: number;
}

/** Mapea un error a { status HTTP, código de catálogo, mensaje seguro }. */
function mapError(err: unknown): MappedError {
  if (err instanceof ValidationError) {
    return { status: 400, code: ErrorCodes.VALIDATION_ERROR, message: err.message, details: err.details };
  }
  if (err instanceof AuthenticationError) {
    return { status: 401, code: ErrorCodes.AUTHENTICATION_REQUIRED, message: err.message };
  }
  if (err instanceof AuthorizationError) {
    if (err.maskedAs404) {
      return { status: 404, code: ErrorCodes.RESOURCE_NOT_FOUND, message: 'Resource not found', masked: true };
    }
    return { status: 403, code: ErrorCodes.FORBIDDEN, message: err.message };
  }
  if (err instanceof NotFoundError) {
    return { status: 404, code: ErrorCodes.RESOURCE_NOT_FOUND, message: err.message };
  }
  if (err instanceof EmailTakenError) {
    return { status: 409, code: ErrorCodes.EMAIL_TAKEN, message: err.message };
  }
  if (err instanceof CurrencyImmutableError) {
    return { status: 409, code: ErrorCodes.CURRENCY_IMMUTABLE, message: err.message };
  }
  if (err instanceof MaxQuoteRequestsExceededError) {
    return { status: 409, code: ErrorCodes.MAX_QUOTE_REQUESTS_EXCEEDED, message: err.message };
  }
  if (err instanceof DuplicateQuoteRequestActiveError) {
    return { status: 409, code: ErrorCodes.DUPLICATE_QUOTE_REQUEST_ACTIVE, message: err.message };
  }
  if (err instanceof QuoteExpiredError) {
    return { status: 410, code: ErrorCodes.QUOTE_EXPIRED, message: err.message };
  }
  if (err instanceof MissingInputError) {
    return { status: 400, code: ErrorCodes.MISSING_INPUT, message: err.message };
  }
  if (err instanceof UnsupportedLanguageError) {
    return { status: 422, code: ErrorCodes.UNSUPPORTED_LANGUAGE, message: err.message };
  }
  if (err instanceof AiInvalidOutputError) {
    return { status: 422, code: ErrorCodes.AI_INVALID_OUTPUT, message: err.message };
  }
  if (err instanceof InvalidStateTransitionError) {
    return { status: 422, code: ErrorCodes.INVALID_STATE_TRANSITION, message: err.message };
  }
  if (err instanceof AiProviderUnavailableError) {
    return { status: 503, code: ErrorCodes.AI_PROVIDER_UNAVAILABLE, message: err.message };
  }
  if (err instanceof AiProviderTimeoutError) {
    return { status: 503, code: ErrorCodes.AI_PROVIDER_TIMEOUT, message: err.message };
  }
  if (err instanceof AIProviderNotConfiguredError) {
    return { status: 503, code: ErrorCodes.AI_PROVIDER_NOT_CONFIGURED, message: err.message };
  }
  // US-086 (PB-P0-014): reset surgical Demo. Antes del ConflictError genérico para preservar el
  // código específico `SEED_RESET_IN_PROGRESS` (EC-03) en el envelope.
  if (err instanceof SeedResetInProgressError) {
    return { status: 409, code: ErrorCodes.SEED_RESET_IN_PROGRESS, message: err.message };
  }
  if (err instanceof SeedResetFailedError) {
    return { status: 500, code: ErrorCodes.SEED_RESET_FAILED, message: err.message };
  }
  if (err instanceof ConflictError) {
    return { status: 409, code: ErrorCodes.CONFLICT, message: err.message };
  }
  if (err instanceof BusinessRuleViolationError) {
    return { status: 422, code: err.code, message: err.message, details: err.details };
  }
  if (err instanceof RateLimitError) {
    return {
      status: 429,
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      message: err.message,
      retryAfterSeconds: err.retryAfterSeconds,
    };
  }
  if (err instanceof BadRequestError) {
    return { status: 400, code: ErrorCodes.BAD_REQUEST, message: err.message };
  }
  if (err instanceof AITimeoutError) {
    return { status: 504, code: ErrorCodes.AI_PROVIDER_TIMEOUT, message: 'AI provider timeout' };
  }
  if (err instanceof AIProviderError) {
    return { status: 502, code: ErrorCodes.AI_PROVIDER_ERROR, message: 'AI provider error' };
  }
  if (err instanceof PrismaPersistenceError) {
    return { status: 500, code: ErrorCodes.PERSISTENCE_ERROR, message: 'Internal server error' };
  }
  if (err instanceof InfrastructureError) {
    // ExternalIntegrationError u otra infra no específica → 502 genérico.
    return { status: 502, code: ErrorCodes.AI_PROVIDER_ERROR, message: 'External service error' };
  }
  if (err instanceof AppError) {
    // Otros errores de dominio (e.g., BadRequest-like) → 400 con su código.
    return { status: 400, code: err.code, message: err.message };
  }
  // Errores de body-parser (express.json) → 400.
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: unknown }).type;
    if (typeof type === 'string' && BODY_PARSER_ERROR_TYPES.has(type)) {
      return { status: 400, code: ErrorCodes.BAD_REQUEST, message: 'Invalid request body' };
    }
  }
  // Catch-all: nunca exponer el mensaje/stack original.
  return { status: 500, code: ErrorCodes.INTERNAL_ERROR, message: 'Error interno del servidor.' };
}

export const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const correlationId = req.correlationId ?? '';
  const mapped = mapError(err);

  // ── Observabilidad ────────────────────────────────────────────────────────
  if (mapped.status >= 500) {
    logger.error({
      event: 'unexpected_error',
      correlationId,
      method: req.method,
      path: req.path,
      httpStatus: mapped.status,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else if (mapped.masked) {
    logger.warn({
      event: 'authorization_masked_as_404',
      correlationId,
      method: req.method,
      path: req.path,
      realStatus: 403,
    });
  } else {
    logger.warn({
      event: 'domain_error',
      correlationId,
      code: mapped.code,
      httpStatus: mapped.status,
      method: req.method,
      path: req.path,
    });
  }

  // ── Cabecera Retry-After para rate limit ──────────────────────────────────
  if (mapped.retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(mapped.retryAfterSeconds));
  }

  // ── Serialización del error envelope ANIDADO (sin stack/SQL/paths) ─────────
  const error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    correlationId: string;
  } = { code: mapped.code, message: mapped.message, correlationId };
  if (mapped.details && mapped.details.length > 0) {
    error.details = mapped.details;
  }

  res.status(mapped.status).json({ error });
};
