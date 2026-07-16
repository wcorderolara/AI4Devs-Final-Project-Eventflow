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
import { AlreadyAuthenticatedError } from '../../domain/errors/already-authenticated.error.js';
import { MethodNotAllowedError } from '../../domain/errors/method-not-allowed.error.js';
import {
  TokenInvalidError,
  TokenUsedError,
  TokenExpiredError,
} from '../../domain/errors/password-reset.errors.js';
import { CurrencyImmutableError } from '../../domain/errors/currency-immutable.error.js';
import {
  MaxQuoteRequestsExceededError,
  DuplicateQuoteRequestActiveError,
  QuoteExpiredError,
} from '../../domain/errors/quote-flow.errors.js';
import {
  MissingInputError,
  AiInvalidBudgetError,
  UnsupportedLanguageError,
  AiInvalidOutputError,
  InvalidStateTransitionError,
  AiProviderUnavailableError,
  AiProviderTimeoutError,
  AIProviderNotConfiguredError,
} from '../../domain/errors/ai.errors.js';
// Nota: la excepción ADR-ARCH-001 para este archivo está declarada en `.eslintrc.cjs` (override).
// El error handler global necesita conocer todos los DomainError de módulos para mapear HTTP.
import {
  RecommendationNotPendingError,
  RecommendationTypeNotApplicableError,
  EditedPayloadInvalidError,
  SideEffectFailedError,
  OwnershipDeniedError,
} from '../../../modules/ai-assistance/domain/errors/hitl.errors.js';
import {
  BulkLimitExceededError,
  EventNotMutableError,
} from '../../../modules/task-management/bulk-confirm/domain/errors/bulk-confirm.errors.js';
import {
  CategoryNotAvailableError,
  DueDateInPastError,
  UnsupportedMediaTypeError,
} from '../../../modules/task-management/create/domain/errors/create-event-task.errors.js';
import {
  EmptyPatchError,
  InvalidTransitionDomainError,
} from '../../../modules/task-management/mutate/domain/errors/mutate-event-task.errors.js';
import {
  ItemHasCommitmentError,
  ItemHasPendingIntentError,
  ItemCategoryLockedError,
  EventNotEditableError,
  InvalidCategoryCodeError,
  CategoryInactiveError,
  CurrencyMismatchError,
  InvalidValueError,
  PayloadInvalidError,
} from '../../../modules/budget-management/domain/errors/budget-item.errors.js';
import {
  VendorProfileAlreadyExistsError,
  VendorProfileNotFoundError,
  VendorProfileRejectedError,
  VendorProfileHiddenError,
  VendorProfileAlreadyDeletedError,
  CategoryChangeLimitError,
  InvalidCategoriesError,
  InvalidCategoryError,
} from '../../../modules/vendor-management/domain/vendor-profile.errors.js';
import {
  InvalidCurrencyError,
  InvalidDescriptionError,
  InvalidPackageNameError,
  InvalidPriceError,
  VendorServiceLimitReachedError,
  VendorServiceNotFoundError,
} from '../../../modules/vendor-management/domain/vendor-service.errors.js';
import {
  AttachmentNotFoundError,
  FileTooLargeError,
  ImageLimitReachedError,
  InvalidDeletionReasonError,
  InvalidImageError,
  InvalidMimeError,
  InvalidWorkLabelError,
  PortfolioProfileHiddenError,
  PortfolioProfileNotFoundError,
  WorkLabelLimitReachedError,
} from '../../../modules/attachments/domain/attachment.errors.js';
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

/** Tipos de error de body-parser (express.json) que deben mapearse a 400 (excepto entity.too.large → 413). */
const BODY_PARSER_ERROR_TYPES = new Set([
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
  if (err instanceof AlreadyAuthenticatedError) {
    // US-001 SEC-01 (catálogo US-003): sesión activa en endpoint solo-anónimo → 409.
    return { status: 409, code: ErrorCodes.ALREADY_AUTHENTICATED, message: err.message };
  }
  if (err instanceof MethodNotAllowedError) {
    // US-005 EC-03: método HTTP no permitido en la ruta → 405.
    return { status: 405, code: ErrorCodes.METHOD_NOT_ALLOWED, message: err.message };
  }
  // US-004: catálogo del reset de contraseña (EC-01..03).
  if (err instanceof TokenExpiredError) {
    return { status: 410, code: ErrorCodes.GONE_TOKEN_EXPIRED, message: err.message };
  }
  if (err instanceof TokenUsedError) {
    return { status: 400, code: ErrorCodes.TOKEN_USED, message: err.message };
  }
  if (err instanceof TokenInvalidError) {
    return { status: 400, code: ErrorCodes.TOKEN_INVALID, message: err.message };
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
  // US-019 (PB-P1-013 / EC-01): budget_estimated inválido antes del provider → 400.
  if (err instanceof AiInvalidBudgetError) {
    return { status: 400, code: ErrorCodes.INVALID_BUDGET, message: err.message };
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
  // US-025 HITL — Doc 16 §35.3.
  if (err instanceof RecommendationNotPendingError) {
    return { status: 409, code: ErrorCodes.RECOMMENDATION_NOT_PENDING, message: err.message };
  }
  if (err instanceof RecommendationTypeNotApplicableError) {
    return { status: 422, code: ErrorCodes.RECOMMENDATION_TYPE_NOT_APPLICABLE, message: err.message };
  }
  if (err instanceof EditedPayloadInvalidError) {
    return { status: 400, code: ErrorCodes.EDITED_PAYLOAD_INVALID, message: err.message };
  }
  if (err instanceof SideEffectFailedError) {
    return { status: 500, code: ErrorCodes.SIDE_EFFECT_FAILED, message: 'Side effect failed' };
  }
  // US-031 (PB-P1-017): bulk confirm HITL. Errores globales del batch.
  if (err instanceof BulkLimitExceededError) {
    return {
      status: 400,
      code: ErrorCodes.BULK_LIMIT_EXCEEDED,
      message: err.message,
      details: [
        { field: 'taskIds', message: `received=${err.received} limit=${err.limit}` },
      ],
    };
  }
  if (err instanceof EventNotMutableError) {
    return {
      status: 409,
      code: ErrorCodes.EVENT_NOT_MUTABLE,
      message: `Event is not mutable (${err.eventStatus})`,
      details: [{ field: 'event_status', message: err.eventStatus }],
    };
  }
  // US-028 (PB-P1-018): categoría no disponible (inexistente o `is_active=false`).
  if (err instanceof CategoryNotAvailableError) {
    return {
      status: 400,
      code: ErrorCodes.CATEGORY_NOT_AVAILABLE,
      message: err.message,
      details: [{ field: 'category_code', message: 'not_available' }],
    };
  }
  if (err instanceof DueDateInPastError) {
    return {
      status: 400,
      code: ErrorCodes.DUE_DATE_IN_PAST,
      message: err.message,
      details: [{ field: 'due_date', message: 'due_date_in_past' }],
    };
  }
  if (err instanceof UnsupportedMediaTypeError) {
    return {
      status: 415,
      code: ErrorCodes.UNSUPPORTED_MEDIA_TYPE,
      message: err.message,
    };
  }
  // US-029 (PB-P1-018): PATCH content sin campos editables (EC-06).
  if (err instanceof EmptyPatchError) {
    return {
      status: 400,
      code: ErrorCodes.EMPTY_PATCH,
      message: err.message,
    };
  }
  // US-036 (PB-P1-020 R1): CRUD BudgetItem — bloqueos de mutación.
  if (err instanceof ItemHasCommitmentError) {
    return {
      status: 409,
      code: ErrorCodes.ITEM_HAS_COMMITMENT,
      message: err.message,
      details: [{ field: 'amount_committed', message: String(err.amountCommitted) }],
    };
  }
  if (err instanceof ItemHasPendingIntentError) {
    return {
      status: 409,
      code: ErrorCodes.ITEM_HAS_PENDING_INTENT,
      message: err.message,
    };
  }
  if (err instanceof ItemCategoryLockedError) {
    return {
      status: 409,
      code: ErrorCodes.ITEM_HAS_COMMITMENT_CATEGORY_LOCKED,
      message: err.message,
      details: [{ field: 'amount_committed', message: String(err.amountCommitted) }],
    };
  }
  if (err instanceof EventNotEditableError) {
    return {
      status: 409,
      code: ErrorCodes.EVENT_NOT_EDITABLE,
      message: err.message,
      details: [{ field: 'event_status', message: err.eventStatus }],
    };
  }
  if (err instanceof InvalidCategoryCodeError) {
    return {
      status: 400,
      code: ErrorCodes.INVALID_CATEGORY_CODE,
      message: err.message,
      details: [{ field: 'category_code', message: err.categoryCode }],
    };
  }
  // US-037 (PB-P1-021)
  if (err instanceof CategoryInactiveError) {
    return {
      status: 409,
      code: ErrorCodes.CATEGORY_INACTIVE,
      message: err.message,
      details: err.inactiveCategories.map((c) => ({
        field: 'inactive_categories',
        message: `${c.code}:${c.name}`,
      })),
    };
  }
  if (err instanceof CurrencyMismatchError) {
    return {
      status: 409,
      code: ErrorCodes.CURRENCY_MISMATCH,
      message: err.message,
      details: [
        { field: 'recommendation_currency', message: err.recommendationCurrency },
        { field: 'event_currency', message: err.eventCurrency },
      ],
    };
  }
  if (err instanceof InvalidValueError) {
    return {
      status: 400,
      code: ErrorCodes.INVALID_VALUE,
      message: err.message,
      details: [{ field: 'editedPayload', message: err.detail }],
    };
  }
  if (err instanceof PayloadInvalidError) {
    return {
      status: 422,
      code: ErrorCodes.PAYLOAD_INVALID,
      message: err.message,
      details: [{ field: 'output_payload', message: err.detail }],
    };
  }
  // US-029 (PB-P1-018): PATCH status contra state machine (EC-02) — 409 con detalles.
  if (err instanceof InvalidTransitionDomainError) {
    return {
      status: 409,
      code: ErrorCodes.INVALID_TRANSITION,
      message: err.message,
      details: [
        { field: 'current_status', message: err.current },
        { field: 'requested_status', message: err.requested },
        { field: 'allowed_transitions', message: err.allowed.join(',') },
      ],
    };
  }
  if (err instanceof OwnershipDeniedError) {
    // admin_excluded → 403 FORBIDDEN; not_owner → 404 RESOURCE_NOT_FOUND (no-revelación).
    if (err.reason === 'admin_excluded') {
      return { status: 403, code: ErrorCodes.FORBIDDEN, message: 'Admins cannot perform HITL actions' };
    }
    return { status: 404, code: ErrorCodes.RESOURCE_NOT_FOUND, message: 'Resource not found', masked: true };
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
  // US-040 (PB-P1-024): el vendor ya tiene un VendorProfile (EC-01) → 409 con código específico
  // `PROFILE_EXISTS`. Antes del ConflictError genérico para conservar el código estable.
  if (err instanceof VendorProfileAlreadyExistsError) {
    return { status: 409, code: ErrorCodes.PROFILE_EXISTS, message: err.message };
  }
  // US-041 (PB-P1-024): errores tipados del PATCH/DELETE del VendorProfile.
  if (err instanceof VendorProfileNotFoundError) {
    return { status: 404, code: ErrorCodes.PROFILE_NOT_FOUND, message: err.message };
  }
  if (err instanceof VendorProfileRejectedError) {
    return { status: 409, code: ErrorCodes.PROFILE_REJECTED, message: err.message };
  }
  if (err instanceof VendorProfileHiddenError) {
    return { status: 409, code: ErrorCodes.PROFILE_HIDDEN, message: err.message };
  }
  if (err instanceof VendorProfileAlreadyDeletedError) {
    return { status: 409, code: ErrorCodes.PROFILE_DELETED, message: err.message };
  }
  // US-042 (PB-P1-025): cambiar categorías del vendor.
  if (err instanceof CategoryChangeLimitError) {
    return { status: 409, code: ErrorCodes.CATEGORY_CHANGE_LIMIT, message: err.message };
  }
  if (err instanceof InvalidCategoriesError) {
    return { status: 400, code: ErrorCodes.INVALID_CATEGORIES, message: err.message };
  }
  if (err instanceof InvalidCategoryError) {
    return {
      status: 400,
      code: ErrorCodes.INVALID_CATEGORY,
      message: err.message,
      details: err.unknownOrInactive.map((id) => ({ field: 'service_category_ids', message: id })),
    };
  }
  // US-044 (PB-P1-027): CRUD `VendorService`.
  if (err instanceof InvalidPackageNameError) {
    return { status: 400, code: ErrorCodes.INVALID_PACKAGE_NAME, message: err.message };
  }
  if (err instanceof InvalidPriceError) {
    return { status: 400, code: ErrorCodes.INVALID_PRICE, message: err.message };
  }
  if (err instanceof InvalidCurrencyError) {
    return { status: 400, code: ErrorCodes.INVALID_CURRENCY, message: err.message };
  }
  if (err instanceof InvalidDescriptionError) {
    return { status: 400, code: ErrorCodes.INVALID_DESCRIPTION, message: err.message };
  }
  if (err instanceof VendorServiceLimitReachedError) {
    return { status: 409, code: ErrorCodes.SERVICE_LIMIT_REACHED, message: err.message };
  }
  if (err instanceof VendorServiceNotFoundError) {
    return { status: 404, code: ErrorCodes.SERVICE_NOT_FOUND, message: err.message };
  }
  // US-043 (PB-P1-026): upload de imágenes del portafolio del vendor.
  if (err instanceof PortfolioProfileNotFoundError) {
    return { status: 404, code: ErrorCodes.PROFILE_NOT_FOUND, message: err.message };
  }
  if (err instanceof PortfolioProfileHiddenError) {
    return { status: 409, code: ErrorCodes.PROFILE_HIDDEN, message: err.message };
  }
  if (err instanceof InvalidMimeError) {
    return { status: 400, code: ErrorCodes.INVALID_MIME, message: err.message };
  }
  if (err instanceof InvalidImageError) {
    return { status: 400, code: ErrorCodes.INVALID_IMAGE, message: err.message };
  }
  if (err instanceof InvalidWorkLabelError) {
    return { status: 400, code: ErrorCodes.INVALID_WORK_LABEL, message: err.message };
  }
  if (err instanceof ImageLimitReachedError) {
    return { status: 409, code: ErrorCodes.IMAGE_LIMIT_REACHED, message: err.message };
  }
  if (err instanceof WorkLabelLimitReachedError) {
    return { status: 409, code: ErrorCodes.WORK_LABEL_LIMIT_REACHED, message: err.message };
  }
  if (err instanceof FileTooLargeError) {
    return { status: 413, code: ErrorCodes.FILE_TOO_LARGE, message: err.message };
  }
  if (err instanceof AttachmentNotFoundError) {
    return { status: 404, code: ErrorCodes.ATTACHMENT_NOT_FOUND, message: err.message };
  }
  if (err instanceof InvalidDeletionReasonError) {
    return { status: 400, code: ErrorCodes.INVALID_DELETION_REASON, message: err.message };
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
  // Errores de body-parser (express.json).
  if (typeof err === 'object' && err !== null && 'type' in err) {
    const type = (err as { type?: unknown }).type;
    // US-025 EC-06: entity.too.large → 413 PAYLOAD_TOO_LARGE (body>256KB en /apply scoped).
    if (type === 'entity.too.large') {
      return { status: 413, code: ErrorCodes.PAYLOAD_TOO_LARGE, message: 'Request payload too large' };
    }
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
