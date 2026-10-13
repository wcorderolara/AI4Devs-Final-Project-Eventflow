// Caracterización del mapeo error → HTTP del errorHandlerMiddleware (refactor PR-2).
// Fija, por cada clase de error que el handler conoce, la respuesta HTTP exacta (status, body
// byte a byte, cabecera Retry-After) y el log emitido (nivel + campos). Se ejecuta contra una app
// Express mínima con supertest, así que no depende de cómo esté implementado el mapeo.
// Para clases que aceptan `message` se pasa uno propio (`m:<Clase>`): si la respuesta lo muestra,
// el handler usa `err.message`; si muestra otro texto, el mensaje es fijo (masking/genérico).
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { ZodError, z } from 'zod';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { AppError } from '../../src/shared/domain/errors/app.error.js';
import { InfrastructureError } from '../../src/shared/domain/errors/infrastructure.error.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { AuthenticationError } from '../../src/shared/domain/errors/authentication.error.js';
import { UnauthorizedError } from '../../src/shared/domain/errors/unauthorized.error.js';
import { AuthorizationError } from '../../src/shared/domain/errors/authorization.error.js';
import { ForbiddenError } from '../../src/shared/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { ConflictError } from '../../src/shared/domain/errors/conflict.error.js';
import { EmailTakenError } from '../../src/shared/domain/errors/email-taken.error.js';
import { AlreadyAuthenticatedError } from '../../src/shared/domain/errors/already-authenticated.error.js';
import { MethodNotAllowedError } from '../../src/shared/domain/errors/method-not-allowed.error.js';
import {
  OAuthStateInvalidError,
  OAuthVerificationError,
  OAuthAccountConflictError,
  OAuthContinuationInvalidError,
} from '../../src/shared/domain/errors/oauth.errors.js';
import {
  TokenInvalidError,
  TokenUsedError,
  TokenExpiredError,
} from '../../src/shared/domain/errors/password-reset.errors.js';
import { CurrencyImmutableError } from '../../src/shared/domain/errors/currency-immutable.error.js';
import { EventLanguageNotEditableError } from '../../src/shared/domain/errors/event-language-not-editable.error.js';
import {
  MaxQuoteRequestsExceededError,
  DuplicateQuoteRequestActiveError,
  QuoteExpiredError,
} from '../../src/shared/domain/errors/quote-flow.errors.js';
import {
  MissingInputError,
  AiInvalidBudgetError,
  UnsupportedLanguageError,
  AiInvalidOutputError,
  AiInvalidOutputSchemaError,
  AiOutputParseError,
  InvalidStateTransitionError,
  AiProviderUnavailableError,
  AiProviderTimeoutError,
  AiFallbackFailedError,
  AiConfigInvalidError,
  AIProviderNotConfiguredError,
} from '../../src/shared/domain/errors/ai.errors.js';
import { CaptchaRequiredError, CaptchaInvalidError } from '../../src/shared/domain/errors/captcha.errors.js';
import { SeedResetInProgressError, SeedResetFailedError } from '../../src/shared/domain/errors/seed-demo.errors.js';
import { BusinessRuleViolationError } from '../../src/shared/domain/errors/business-rule-violation.error.js';
import { RateLimitError } from '../../src/shared/domain/errors/rate-limit.error.js';
import { BadRequestError } from '../../src/shared/domain/errors/bad-request.error.js';
import { PrismaPersistenceError } from '../../src/shared/domain/errors/prisma-persistence.error.js';
import {
  EventNotFoundError,
  EventNotActiveError,
  VendorNotAvailableError,
  InvalidBriefError,
  QuoteRequestAlreadyActiveError,
  QuoteRequestCategoryLimitReachedError,
  ServiceCategoryUnavailableError,
} from '../../src/modules/quote-flow/domain/us049.errors.js';
import {
  QrNotFoundError,
  QrNotRespondableError,
  QuoteAlreadyExistsError,
  InvalidValidUntilError,
} from '../../src/modules/quote-flow/domain/us052.errors.js';
import {
  QuoteNotFoundError,
  QuoteNotRejectableError,
  InvalidRejectionReasonError,
} from '../../src/modules/quote-flow/domain/us054.errors.js';
import {
  QrNotFoundError as Us056QrNotFoundError,
  QrNotCancellableError,
  QrHasConfirmedBookingError,
  InvalidCancellationReasonError,
} from '../../src/modules/quote-flow/domain/us056.errors.js';
import {
  CompareQuotesCategoryRequiredError,
  CompareQuotesInvalidCategoryError,
} from '../../src/modules/quote-flow/domain/us057.errors.js';
import { QuoteNotPreferableError } from '../../src/modules/quote-flow/domain/us058.errors.js';
import {
  Us022CategoryCodeRequiredError,
  Us022InsufficientQuotesError,
  Us022InvalidCategoryError,
} from '../../src/modules/ai-assistance/domain/us022.errors.js';
import { Us026RegenerationLimitError } from '../../src/modules/ai-assistance/domain/us026.errors.js';
import {
  RecommendationNotPendingError,
  RecommendationTypeNotApplicableError,
  EditedPayloadInvalidError,
  SideEffectFailedError,
  OwnershipDeniedError,
} from '../../src/modules/ai-assistance/domain/errors/hitl.errors.js';
import { PromptNotFoundError } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.js';
import { AIRecommendationValidationError } from '../../src/modules/ai-assistance/domain/errors/ai-recommendation-persistence.errors.js';
import {
  DisclaimerRequiredError,
  QuoteNotAcceptableError,
  BookingIntentAlreadyExistsError,
  QuoteNotFoundForBookingError,
} from '../../src/modules/booking-intent/domain/us060.errors.js';
import {
  BookingIntentNotFoundError,
  BookingIntentNotConfirmableError,
} from '../../src/modules/booking-intent/domain/us061.errors.js';
import {
  BookingIntentNotCancellableError,
  InvalidCancellationReasonError as Us062InvalidCancellationReasonError,
} from '../../src/modules/booking-intent/domain/us062.errors.js';
import {
  ReviewNotEligibleError,
  ReviewTargetNotFoundError,
} from '../../src/modules/reviews-moderation/domain/us065.errors.js';
import {
  VendorNotFoundForReviewsError,
  Us066InvalidCursorError,
} from '../../src/modules/reviews-moderation/domain/us066.errors.js';
import {
  InvalidReviewTransitionError,
  ReviewNotFoundForModerationError,
} from '../../src/modules/reviews-moderation/domain/us067.errors.js';
import {
  InvalidVendorTransitionError,
  VendorNotFoundForModerationError,
} from '../../src/modules/admin-governance/domain/us047.errors.js';
import { Us074InvalidCursorError } from '../../src/modules/admin-governance/domain/us074.errors.js';
import {
  CategoryHasChildrenError,
  CategoryInUseError,
  DuplicateCategoryCodeError,
  InvalidHierarchyDepthError,
  InvalidNameI18nError,
  InvalidParentIdError,
  InvalidReasonLengthError,
  ReasonRequiredError,
  ServiceCategoryNotFoundError,
} from '../../src/modules/service-catalog/domain/us075.errors.js';
import {
  EventTypeNotFoundError,
  EventTypeInUseError,
  DuplicateEventTypeCodeError,
} from '../../src/modules/event-catalog/domain/us076.errors.js';
import {
  BulkLimitExceededError,
  EventNotMutableError,
} from '../../src/modules/task-management/bulk-confirm/domain/errors/bulk-confirm.errors.js';
import {
  CategoryNotAvailableError,
  DueDateInPastError,
  UnsupportedMediaTypeError,
} from '../../src/modules/task-management/create/domain/errors/create-event-task.errors.js';
import {
  EmptyPatchError,
  InvalidTransitionDomainError,
} from '../../src/modules/task-management/mutate/domain/errors/mutate-event-task.errors.js';
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
} from '../../src/modules/budget-management/domain/errors/budget-item.errors.js';
import {
  VendorProfileAlreadyExistsError,
  VendorProfileNotFoundError,
  VendorProfileRejectedError,
  VendorProfileHiddenError,
  VendorProfileAlreadyDeletedError,
  CategoryChangeLimitError,
  InvalidCategoriesError,
  InvalidCategoryError,
} from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import {
  InvalidCurrencyError,
  InvalidDescriptionError,
  InvalidPackageNameError,
  InvalidPriceError,
  VendorServiceLimitReachedError,
  VendorServiceNotFoundError,
} from '../../src/modules/vendor-management/domain/vendor-service.errors.js';
import {
  InvalidCursorError,
  InvalidFiltersError,
} from '../../src/modules/vendor-management/application/vendor-search.errors.js';
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
} from '../../src/modules/attachments/domain/attachment.errors.js';

const CORRELATION_ID = 'corr-characterization';
const PATH = '/boom';

// Subclases mínimas para ejercitar los fallbacks genéricos de AppError / InfrastructureError.
class TestAppError extends AppError {
  readonly code = 'TEST_CUSTOM_CODE';
}
class TestInfraError extends InfrastructureError {
  readonly code = 'TEST_INFRA_CODE';
}

interface Detail {
  field: string;
  message: string;
}
interface Expected {
  status: number;
  code: string;
  message: string;
  details?: Detail[];
  /** 404 enmascarado: se loguea `authorization_masked_as_404` en vez de `domain_error`. */
  masked?: boolean;
  /** Valor esperado de la cabecera `Retry-After` (ausente si undefined). */
  retryAfter?: string;
}
type Case = [name: string, make: () => unknown, expected: Expected];

const d = (field: string, message: string): Detail => ({ field, message });
const NOT_FOUND_MASKED = { status: 404, code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', masked: true };
const INTERNAL = { status: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' };

const CASES: Case[] = [
  // ── Shared kernel ─────────────────────────────────────────────────────────
  ['ValidationError con details', () => new ValidationError('m:Validation', [d('body.email', 'Invalid email'), d('body.name', 'Required')]),
    { status: 400, code: 'VALIDATION_ERROR', message: 'm:Validation', details: [d('body.email', 'Invalid email'), d('body.name', 'Required')] }],
  ['ValidationError sin details', () => new ValidationError('m:Validation'), { status: 400, code: 'VALIDATION_ERROR', message: 'm:Validation' }],
  ['ValidationError details vacío', () => new ValidationError('m:Validation', []), { status: 400, code: 'VALIDATION_ERROR', message: 'm:Validation' }],
  ['AuthenticationError', () => new AuthenticationError('m:Authn'), { status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'm:Authn' }],
  ['AuthenticationError default', () => new AuthenticationError(), { status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'Autenticación requerida' }],
  ['UnauthorizedError', () => new UnauthorizedError('m:Unauthorized'), { status: 401, code: 'AUTHENTICATION_REQUIRED', message: 'm:Unauthorized' }],
  ['AuthorizationError', () => new AuthorizationError('m:Authz'), { status: 403, code: 'FORBIDDEN', message: 'm:Authz' }],
  ['AuthorizationError maskedAs404', () => new AuthorizationError('m:Authz', true), NOT_FOUND_MASKED],
  ['ForbiddenError', () => new ForbiddenError('m:Forbidden'), { status: 403, code: 'FORBIDDEN', message: 'm:Forbidden' }],
  ['NotFoundError', () => new NotFoundError('m:NotFound'), { status: 404, code: 'RESOURCE_NOT_FOUND', message: 'm:NotFound' }],
  ['ConflictError', () => new ConflictError('m:Conflict'), { status: 409, code: 'CONFLICT', message: 'm:Conflict' }],
  ['EmailTakenError', () => new EmailTakenError('m:EmailTaken'), { status: 409, code: 'EMAIL_TAKEN', message: 'm:EmailTaken' }],
  ['AlreadyAuthenticatedError', () => new AlreadyAuthenticatedError('m:AlreadyAuth'), { status: 409, code: 'ALREADY_AUTHENTICATED', message: 'm:AlreadyAuth' }],
  ['MethodNotAllowedError', () => new MethodNotAllowedError('m:Method'), { status: 405, code: 'METHOD_NOT_ALLOWED', message: 'm:Method' }],
  ['OAuthStateInvalidError', () => new OAuthStateInvalidError('nonce_mismatch'), { status: 400, code: 'OAUTH_STATE_INVALID', message: 'No fue posible iniciar sesión' }],
  ['OAuthVerificationError', () => new OAuthVerificationError('aud_mismatch'), { status: 400, code: 'OAUTH_VERIFICATION_FAILED', message: 'No fue posible iniciar sesión' }],
  ['OAuthAccountConflictError', () => new OAuthAccountConflictError('sub_linked'), { status: 409, code: 'OAUTH_ACCOUNT_CONFLICT', message: 'No fue posible iniciar sesión' }],
  ['OAuthContinuationInvalidError', () => new OAuthContinuationInvalidError('expired'), { status: 410, code: 'OAUTH_CONTINUATION_INVALID', message: 'No fue posible completar' }],
  ['TokenExpiredError', () => new TokenExpiredError('m:TokenExpired'), { status: 410, code: 'GONE_TOKEN_EXPIRED', message: 'm:TokenExpired' }],
  ['TokenUsedError', () => new TokenUsedError('m:TokenUsed'), { status: 400, code: 'TOKEN_USED', message: 'm:TokenUsed' }],
  ['TokenInvalidError', () => new TokenInvalidError('m:TokenInvalid'), { status: 400, code: 'TOKEN_INVALID', message: 'm:TokenInvalid' }],
  ['CurrencyImmutableError', () => new CurrencyImmutableError('m:Currency'), { status: 409, code: 'CURRENCY_IMMUTABLE', message: 'm:Currency' }],
  ['EventLanguageNotEditableError completed', () => new EventLanguageNotEditableError('completed'),
    { status: 409, code: 'EVENT_LANGUAGE_NOT_EDITABLE', message: 'Event language cannot be edited in status completed', details: [d('current_status', 'completed')] }],
  ['EventLanguageNotEditableError cancelled', () => new EventLanguageNotEditableError('cancelled'),
    { status: 409, code: 'EVENT_LANGUAGE_NOT_EDITABLE', message: 'Event language cannot be edited in status cancelled', details: [d('current_status', 'cancelled')] }],
  ['MaxQuoteRequestsExceededError', () => new MaxQuoteRequestsExceededError('m:MaxQR'), { status: 409, code: 'MAX_QUOTE_REQUESTS_EXCEEDED', message: 'm:MaxQR' }],
  ['DuplicateQuoteRequestActiveError', () => new DuplicateQuoteRequestActiveError('m:DupQR'), { status: 409, code: 'DUPLICATE_QUOTE_REQUEST_ACTIVE', message: 'm:DupQR' }],
  ['QuoteExpiredError', () => new QuoteExpiredError('m:QuoteExpired'), { status: 410, code: 'QUOTE_EXPIRED', message: 'm:QuoteExpired' }],
  ['MissingInputError', () => new MissingInputError('m:MissingInput'), { status: 400, code: 'MISSING_INPUT', message: 'm:MissingInput' }],
  ['AiInvalidBudgetError', () => new AiInvalidBudgetError('m:Budget'), { status: 400, code: 'INVALID_BUDGET', message: 'm:Budget' }],
  ['UnsupportedLanguageError', () => new UnsupportedLanguageError('m:Lang'), { status: 422, code: 'UNSUPPORTED_LANGUAGE', message: 'm:Lang' }],
  ['AiInvalidOutputError', () => new AiInvalidOutputError('m:AiOut', { featureType: 'budget' }), { status: 422, code: 'AI_INVALID_OUTPUT', message: 'm:AiOut' }],
  ['InvalidStateTransitionError', () => new InvalidStateTransitionError('m:State'), { status: 422, code: 'INVALID_STATE_TRANSITION', message: 'm:State' }],
  ['AiProviderUnavailableError', () => new AiProviderUnavailableError('m:Unavailable', { provider: 'openai' }), { status: 503, code: 'AI_PROVIDER_UNAVAILABLE', message: 'm:Unavailable' }],
  ['AiProviderTimeoutError', () => new AiProviderTimeoutError('m:Timeout'), { status: 503, code: 'AI_PROVIDER_TIMEOUT', message: 'm:Timeout' }],
  ['AIProviderNotConfiguredError', () => new AIProviderNotConfiguredError('m:NotConfigured'), { status: 503, code: 'AI_PROVIDER_NOT_CONFIGURED', message: 'm:NotConfigured' }],
  ['SeedResetInProgressError', () => new SeedResetInProgressError('m:SeedBusy'), { status: 409, code: 'SEED_RESET_IN_PROGRESS', message: 'm:SeedBusy' }],
  ['SeedResetFailedError', () => new SeedResetFailedError('m:SeedFailed'), { status: 500, code: 'SEED_RESET_FAILED', message: 'm:SeedFailed' }],
  ['BusinessRuleViolationError con details', () => new BusinessRuleViolationError('QUOTE_LIMIT_REACHED', 'm:BRV', [d('limit', '3')]),
    { status: 422, code: 'QUOTE_LIMIT_REACHED', message: 'm:BRV', details: [d('limit', '3')] }],
  ['BusinessRuleViolationError sin details', () => new BusinessRuleViolationError('BUSINESS_RULE_VIOLATION', 'm:BRV'),
    { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'm:BRV' }],
  ['BusinessRuleViolationError details vacío', () => new BusinessRuleViolationError('SOME_RULE', 'm:BRV', []), { status: 422, code: 'SOME_RULE', message: 'm:BRV' }],
  ['RateLimitError con retryAfter', () => new RateLimitError(30, 'm:Rate'), { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'm:Rate', retryAfter: '30' }],
  ['RateLimitError retryAfter 0', () => new RateLimitError(0), { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', retryAfter: '0' }],
  ['RateLimitError sin retryAfter', () => new RateLimitError(undefined, 'm:Rate'), { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'm:Rate' }],
  ['BadRequestError', () => new BadRequestError('m:BadRequest'), { status: 400, code: 'BAD_REQUEST', message: 'm:BadRequest' }],
  ['PrismaPersistenceError', () => new PrismaPersistenceError(new Error('SELECT * leaked'), 'm:Prisma'),
    { status: 500, code: 'PERSISTENCE_ERROR', message: 'Internal server error' }],
  ['InfrastructureError genérico', () => new TestInfraError('m:Infra', new Error('socket hang up')),
    { status: 502, code: 'AI_PROVIDER_ERROR', message: 'External service error' }],
  // Fallback AppError → 400 con su propio código.
  ['AppError genérico (fallback)', () => new TestAppError('m:Custom'), { status: 400, code: 'TEST_CUSTOM_CODE', message: 'm:Custom' }],
  ['CaptchaRequiredError (fallback)', () => new CaptchaRequiredError('m:CaptchaReq'), { status: 400, code: 'CAPTCHA_REQUIRED', message: 'm:CaptchaReq' }],
  ['CaptchaInvalidError (fallback)', () => new CaptchaInvalidError('m:CaptchaInv'), { status: 400, code: 'CAPTCHA_INVALID', message: 'm:CaptchaInv' }],
  ['AiInvalidOutputSchemaError (fallback)', () => new AiInvalidOutputSchemaError('m:Schema'), { status: 400, code: 'AI_INVALID_OUTPUT_SCHEMA', message: 'm:Schema' }],
  ['AiOutputParseError (fallback)', () => new AiOutputParseError('m:Parse'), { status: 400, code: 'AI_OUTPUT_PARSE_ERROR', message: 'm:Parse' }],
  ['AiFallbackFailedError (fallback)', () => new AiFallbackFailedError('m:Fallback'), { status: 400, code: 'AI_FALLBACK_FAILED', message: 'm:Fallback' }],
  ['AiConfigInvalidError (fallback)', () => new AiConfigInvalidError('m:Config'), { status: 400, code: 'AI_CONFIG_INVALID', message: 'm:Config' }],
  ['PromptNotFoundError (fallback)', () => new PromptNotFoundError('m:Prompt'), { status: 400, code: 'PROMPT_NOT_FOUND', message: 'm:Prompt' }],
  ['AIRecommendationValidationError (fallback)', () => new AIRecommendationValidationError('m:AIRecVal'),
    { status: 400, code: 'AI_RECOMMENDATION_VALIDATION', message: 'm:AIRecVal' }],

  // ── quote-flow ────────────────────────────────────────────────────────────
  ['EventNotFoundError', () => new EventNotFoundError('m:EventNotFound'), { status: 404, code: 'EVENT_NOT_FOUND', message: 'm:EventNotFound' }],
  ['EventNotActiveError', () => new EventNotActiveError('draft', 'm:EventNotActive'),
    { status: 409, code: 'EVENT_NOT_ACTIVE', message: 'm:EventNotActive', details: [d('status', 'draft')] }],
  ['VendorNotAvailableError', () => new VendorNotAvailableError('m:VendorNA'), { status: 400, code: 'VENDOR_NOT_AVAILABLE', message: 'm:VendorNA' }],
  ['InvalidBriefError budget', () => new InvalidBriefError('budget', 'm:Brief'), { status: 400, code: 'INVALID_BRIEF', message: 'm:Brief', details: [d('budget', 'invalid')] }],
  ['InvalidBriefError message', () => new InvalidBriefError('message'), { status: 400, code: 'INVALID_BRIEF', message: 'Invalid brief', details: [d('message', 'invalid')] }],
  ['QuoteRequestAlreadyActiveError', () => new QuoteRequestAlreadyActiveError('qr-1', 'm:QRActive'),
    { status: 409, code: 'QR_ALREADY_ACTIVE', message: 'm:QRActive', details: [d('existing_quote_request_id', 'qr-1')] }],
  ['QuoteRequestCategoryLimitReachedError', () => new QuoteRequestCategoryLimitReachedError(3, 'm:QRLimit'),
    { status: 409, code: 'QR_CATEGORY_LIMIT_REACHED', message: 'm:QRLimit', details: [d('active_count', '3')] }],
  ['ServiceCategoryUnavailableError', () => new ServiceCategoryUnavailableError('m:SCUnavailable'),
    { status: 400, code: 'INVALID_CATEGORY', message: 'm:SCUnavailable', details: [d('service_category_id', 'not_available')] }],
  ['QrNotFoundError (us052)', () => new QrNotFoundError('m:QrNotFound'), { status: 404, code: 'QR_NOT_FOUND', message: 'Quote request not found', masked: true }],
  ['QrNotRespondableError status', () => new QrNotRespondableError('status', 'cancelled', 'm:NotRespondable'),
    { status: 409, code: 'QR_NOT_RESPONDABLE', message: 'm:NotRespondable', details: [d('status', 'cancelled')] }],
  ['QrNotRespondableError expired', () => new QrNotRespondableError('expired', '2026-01-01'),
    { status: 409, code: 'QR_NOT_RESPONDABLE', message: 'Quote request is not respondable', details: [d('expired', '2026-01-01')] }],
  ['QuoteAlreadyExistsError', () => new QuoteAlreadyExistsError('q-1', 'm:QuoteExists'),
    { status: 409, code: 'QUOTE_ALREADY_EXISTS', message: 'm:QuoteExists', details: [d('existing_quote_id', 'q-1')] }],
  ['InvalidValidUntilError', () => new InvalidValidUntilError('m:ValidUntil'),
    { status: 400, code: 'INVALID_VALID_UNTIL', message: 'm:ValidUntil', details: [d('valid_until', 'out_of_range')] }],
  ['QuoteNotFoundError', () => new QuoteNotFoundError('m:QuoteNotFound'), { status: 404, code: 'QUOTE_NOT_FOUND', message: 'Quote not found', masked: true }],
  ['QuoteNotRejectableError', () => new QuoteNotRejectableError('accepted', 'm:NotRejectable'),
    { status: 409, code: 'QUOTE_NOT_REJECTABLE', message: 'm:NotRejectable', details: [d('current_status', 'accepted')] }],
  ['InvalidRejectionReasonError', () => new InvalidRejectionReasonError('m:RejectReason'),
    { status: 400, code: 'INVALID_REJECTION_REASON', message: 'm:RejectReason', details: [d('reason', 'too_long')] }],
  ['QrNotFoundError (us056)', () => new Us056QrNotFoundError('m:QrNotFound56'), { status: 404, code: 'QR_NOT_FOUND', message: 'Quote request not found', masked: true }],
  ['QrNotCancellableError', () => new QrNotCancellableError('closed', 'm:NotCancellable'),
    { status: 409, code: 'QR_NOT_CANCELLABLE', message: 'm:NotCancellable', details: [d('current_status', 'closed')] }],
  ['QrHasConfirmedBookingError', () => new QrHasConfirmedBookingError('bi-1', 'm:HasBooking'),
    { status: 409, code: 'QR_HAS_CONFIRMED_BOOKING', message: 'm:HasBooking', details: [d('booking_intent_id', 'bi-1')] }],
  ['InvalidCancellationReasonError (us056)', () => new InvalidCancellationReasonError('m:CancelReason56'),
    { status: 400, code: 'INVALID_CANCELLATION_REASON', message: 'm:CancelReason56', details: [d('reason', 'too_long')] }],
  ['CompareQuotesCategoryRequiredError', () => new CompareQuotesCategoryRequiredError('m:CmpRequired'),
    { status: 400, code: 'INVALID_FILTERS', message: 'm:CmpRequired', details: [d('categoryCode', 'required')] }],
  ['CompareQuotesInvalidCategoryError', () => new CompareQuotesInvalidCategoryError('PHOTO', 'm:CmpInvalid'),
    { status: 400, code: 'INVALID_CATEGORY', message: 'm:CmpInvalid', details: [d('categoryCode', 'PHOTO')] }],
  ['QuoteNotPreferableError', () => new QuoteNotPreferableError('rejected', 'm:NotPreferable'),
    { status: 409, code: 'QUOTE_NOT_PREFERABLE', message: 'm:NotPreferable', details: [d('current_status', 'rejected')] }],

  // ── ai-assistance ─────────────────────────────────────────────────────────
  ['Us022CategoryCodeRequiredError', () => new Us022CategoryCodeRequiredError('m:U22Required'),
    { status: 400, code: 'INVALID_FILTERS', message: 'm:U22Required', details: [d('category_code', 'required')] }],
  ['Us022InsufficientQuotesError', () => new Us022InsufficientQuotesError(1, 'm:U22Insufficient'),
    { status: 400, code: 'INSUFFICIENT_QUOTES', message: 'm:U22Insufficient', details: [d('eligible_count', '1')] }],
  ['Us022InvalidCategoryError', () => new Us022InvalidCategoryError('VENUE', 'm:U22Invalid'),
    { status: 400, code: 'INVALID_CATEGORY', message: 'm:U22Invalid', details: [d('categoryCode', 'VENUE')] }],
  ['Us026RegenerationLimitError', () => new Us026RegenerationLimitError(3, 3, 'm:Regen'),
    { status: 429, code: 'REGENERATION_LIMIT', message: 'm:Regen', details: [d('current_count', '3'), d('max', '3')] }],
  ['RecommendationNotPendingError', () => new RecommendationNotPendingError('m:NotPending'), { status: 409, code: 'RECOMMENDATION_NOT_PENDING', message: 'm:NotPending' }],
  ['RecommendationTypeNotApplicableError', () => new RecommendationTypeNotApplicableError('weird_type'),
    { status: 422, code: 'RECOMMENDATION_TYPE_NOT_APPLICABLE', message: 'No apply strategy registered for type: weird_type' }],
  ['EditedPayloadInvalidError', () => new EditedPayloadInvalidError('items.0.amount: expected number', 'm:Edited'),
    { status: 400, code: 'EDITED_PAYLOAD_INVALID', message: 'm:Edited' }],
  ['SideEffectFailedError', () => new SideEffectFailedError('budget_suggestion', new Error('db down'), 'm:SideEffect'),
    { status: 500, code: 'SIDE_EFFECT_FAILED', message: 'Side effect failed' }],
  ['OwnershipDeniedError admin_excluded', () => new OwnershipDeniedError('admin_excluded', 'm:Ownership'),
    { status: 403, code: 'FORBIDDEN', message: 'Admins cannot perform HITL actions' }],
  ['OwnershipDeniedError not_owner', () => new OwnershipDeniedError('not_owner', 'm:Ownership'), NOT_FOUND_MASKED],

  // ── booking-intent ────────────────────────────────────────────────────────
  ['QuoteNotFoundForBookingError', () => new QuoteNotFoundForBookingError('m:QuoteNF4Booking'),
    { status: 404, code: 'QUOTE_NOT_FOUND', message: 'Quote not found', masked: true }],
  ['DisclaimerRequiredError', () => new DisclaimerRequiredError('m:Disclaimer'),
    { status: 400, code: 'DISCLAIMER_REQUIRED', message: 'm:Disclaimer', details: [d('disclaimer_accepted', 'required')] }],
  ['QuoteNotAcceptableError', () => new QuoteNotAcceptableError('expired', 'm:NotAcceptable'),
    { status: 409, code: 'QUOTE_NOT_ACCEPTABLE', message: 'm:NotAcceptable', details: [d('current_status', 'expired')] }],
  ['BookingIntentAlreadyExistsError', () => new BookingIntentAlreadyExistsError('bi-9', 'm:BIExists'),
    { status: 409, code: 'BOOKING_INTENT_ALREADY_EXISTS', message: 'm:BIExists', details: [d('booking_intent_id', 'bi-9')] }],
  ['BookingIntentNotFoundError', () => new BookingIntentNotFoundError('m:BINotFound'),
    { status: 404, code: 'BOOKING_INTENT_NOT_FOUND', message: 'Booking intent not found', masked: true }],
  ['BookingIntentNotConfirmableError', () => new BookingIntentNotConfirmableError('cancelled', 'm:NotConfirmable'),
    { status: 409, code: 'BOOKING_INTENT_NOT_CONFIRMABLE', message: 'm:NotConfirmable', details: [d('current_status', 'cancelled')] }],
  ['BookingIntentNotCancellableError', () => new BookingIntentNotCancellableError('confirmed', 'm:BINotCancellable'),
    { status: 409, code: 'BOOKING_INTENT_NOT_CANCELLABLE', message: 'm:BINotCancellable', details: [d('current_status', 'confirmed')] }],
  ['InvalidCancellationReasonError (us062)', () => new Us062InvalidCancellationReasonError('m:CancelReason62'),
    { status: 400, code: 'INVALID_CANCELLATION_REASON', message: 'm:CancelReason62', details: [d('reason', 'too_long')] }],

  // ── reviews-moderation ────────────────────────────────────────────────────
  ['ReviewTargetNotFoundError', () => new ReviewTargetNotFoundError('m:ReviewTarget'), NOT_FOUND_MASKED],
  ['ReviewNotEligibleError', () => new ReviewNotEligibleError('window_expired', 'm:NotEligible'),
    { status: 403, code: 'REVIEW_NOT_ELIGIBLE', message: 'm:NotEligible', details: [d('reason', 'window_expired')] }],
  ['VendorNotFoundForReviewsError', () => new VendorNotFoundForReviewsError('m:VendorNF4Reviews'), { status: 404, code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' }],
  ['Us066InvalidCursorError', () => new Us066InvalidCursorError('m:Cursor66'), { status: 400, code: 'INVALID_CURSOR', message: 'm:Cursor66' }],
  ['ReviewNotFoundForModerationError', () => new ReviewNotFoundForModerationError('m:ReviewNF'), { status: 404, code: 'REVIEW_NOT_FOUND', message: 'Review not found' }],
  ['InvalidReviewTransitionError', () => new InvalidReviewTransitionError('hidden', 'pending', ['published', 'removed'], 'm:ReviewTransition'),
    { status: 409, code: 'INVALID_TRANSITION', message: 'm:ReviewTransition', details: [d('from', 'hidden'), d('to', 'pending'), d('allowed', 'published,removed')] }],

  // ── admin-governance ──────────────────────────────────────────────────────
  ['VendorNotFoundForModerationError', () => new VendorNotFoundForModerationError('m:VendorNF4Mod'), { status: 404, code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' }],
  ['InvalidVendorTransitionError', () => new InvalidVendorTransitionError('approved', false, 'approved', true, 'hide', ['unhide'], 'm:VendorTransition'),
    {
      status: 409, code: 'INVALID_TRANSITION', message: 'm:VendorTransition',
      details: [d('from_status', 'approved'), d('from_is_hidden', 'false'), d('to_status', 'approved'), d('to_is_hidden', 'true'), d('action', 'hide'), d('allowed', 'unhide')],
    }],
  ['Us074InvalidCursorError', () => new Us074InvalidCursorError('m:Cursor74'), { status: 400, code: 'INVALID_CURSOR', message: 'm:Cursor74' }],

  // ── service-catalog / event-catalog ───────────────────────────────────────
  ['ServiceCategoryNotFoundError', () => new ServiceCategoryNotFoundError('m:SCNotFound'),
    { status: 404, code: 'SERVICE_CATEGORY_NOT_FOUND', message: 'Service category not found' }],
  ['InvalidHierarchyDepthError', () => new InvalidHierarchyDepthError('m:Depth'), { status: 409, code: 'INVALID_HIERARCHY_DEPTH', message: 'm:Depth' }],
  ['DuplicateCategoryCodeError', () => new DuplicateCategoryCodeError('m:DupCat'), { status: 409, code: 'DUPLICATE_CODE', message: 'm:DupCat' }],
  ['CategoryInUseError', () => new CategoryInUseError(7, 'm:CatInUse'), { status: 409, code: 'CATEGORY_IN_USE', message: 'm:CatInUse', details: [d('usage_count', '7')] }],
  ['CategoryHasChildrenError', () => new CategoryHasChildrenError(2, 'm:Children'),
    { status: 409, code: 'CATEGORY_HAS_CHILDREN', message: 'm:Children', details: [d('children_count', '2')] }],
  ['InvalidParentIdError', () => new InvalidParentIdError('m:Parent'), { status: 400, code: 'INVALID_PARENT_ID', message: 'm:Parent' }],
  ['InvalidNameI18nError', () => new InvalidNameI18nError('m:NameI18n'), { status: 400, code: 'INVALID_NAME_I18N', message: 'm:NameI18n' }],
  ['ReasonRequiredError', () => new ReasonRequiredError('m:ReasonReq'), { status: 400, code: 'REASON_REQUIRED', message: 'm:ReasonReq' }],
  ['InvalidReasonLengthError', () => new InvalidReasonLengthError('m:ReasonLen'), { status: 400, code: 'INVALID_REASON_LENGTH', message: 'm:ReasonLen' }],
  ['EventTypeNotFoundError', () => new EventTypeNotFoundError('m:ETNotFound'), { status: 404, code: 'EVENT_TYPE_NOT_FOUND', message: 'Event type not found' }],
  ['EventTypeInUseError', () => new EventTypeInUseError(4, 'm:ETInUse'), { status: 409, code: 'EVENT_TYPE_IN_USE', message: 'm:ETInUse', details: [d('usage_count', '4')] }],
  ['DuplicateEventTypeCodeError', () => new DuplicateEventTypeCodeError('m:DupET'), { status: 409, code: 'DUPLICATE_CODE', message: 'm:DupET' }],

  // ── task-management ───────────────────────────────────────────────────────
  ['BulkLimitExceededError', () => new BulkLimitExceededError(51),
    { status: 400, code: 'BULK_LIMIT_EXCEEDED', message: 'taskIds exceeds bulk limit (received=51, limit=50)', details: [d('taskIds', 'received=51 limit=50')] }],
  ['BulkLimitExceededError limit custom', () => new BulkLimitExceededError(60, 40),
    { status: 400, code: 'BULK_LIMIT_EXCEEDED', message: 'taskIds exceeds bulk limit (received=60, limit=40)', details: [d('taskIds', 'received=60 limit=40')] }],
  ['EventNotMutableError', () => new EventNotMutableError('cancelled'),
    { status: 409, code: 'EVENT_NOT_MUTABLE', message: 'Event is not mutable (cancelled)', details: [d('event_status', 'cancelled')] }],
  ['CategoryNotAvailableError', () => new CategoryNotAvailableError('CATERING'),
    { status: 400, code: 'CATEGORY_NOT_AVAILABLE', message: 'Category not available (code=CATERING)', details: [d('category_code', 'not_available')] }],
  ['DueDateInPastError', () => new DueDateInPastError(),
    { status: 400, code: 'DUE_DATE_IN_PAST', message: 'due_date must be greater than or equal to now()', details: [d('due_date', 'due_date_in_past')] }],
  ['UnsupportedMediaTypeError', () => new UnsupportedMediaTypeError(), { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' }],
  ['EmptyPatchError', () => new EmptyPatchError(), { status: 400, code: 'EMPTY_PATCH', message: 'At least one editable field must be provided.' }],
  ['InvalidTransitionDomainError', () => new InvalidTransitionDomainError('done', 'pending', ['in_progress', 'skipped']),
    {
      status: 409, code: 'INVALID_TRANSITION', message: "Transition not allowed from 'done' to 'pending'.",
      details: [d('current_status', 'done'), d('requested_status', 'pending'), d('allowed_transitions', 'in_progress,skipped')],
    }],

  // ── budget-management ─────────────────────────────────────────────────────
  ['ItemHasCommitmentError', () => new ItemHasCommitmentError(1500),
    { status: 409, code: 'ITEM_HAS_COMMITMENT', message: 'Cannot delete a budget item with committed amount', details: [d('amount_committed', '1500')] }],
  ['ItemHasPendingIntentError', () => new ItemHasPendingIntentError(),
    { status: 409, code: 'ITEM_HAS_PENDING_INTENT', message: 'Cannot delete a budget item with a pending booking intent for its category' }],
  ['ItemCategoryLockedError', () => new ItemCategoryLockedError(200.5),
    { status: 409, code: 'ITEM_HAS_COMMITMENT_CATEGORY_LOCKED', message: 'Cannot change category on a budget item with committed amount', details: [d('amount_committed', '200.5')] }],
  ['EventNotEditableError', () => new EventNotEditableError('completed'),
    { status: 409, code: 'EVENT_NOT_EDITABLE', message: "Event is not editable in status 'completed'", details: [d('event_status', 'completed')] }],
  ['InvalidCategoryCodeError', () => new InvalidCategoryCodeError('XX'),
    { status: 400, code: 'INVALID_CATEGORY_CODE', message: "category_code 'XX' not found or inactive", details: [d('category_code', 'XX')] }],
  ['CategoryInactiveError', () => new CategoryInactiveError([{ code: 'A', name: 'Alpha' }, { code: 'B', name: 'Beta' }]),
    { status: 409, code: 'CATEGORY_INACTIVE', message: 'Some categories are inactive: A, B', details: [d('inactive_categories', 'A:Alpha'), d('inactive_categories', 'B:Beta')] }],
  ['CategoryInactiveError vacío', () => new CategoryInactiveError([]), { status: 409, code: 'CATEGORY_INACTIVE', message: 'Some categories are inactive: ' }],
  ['CurrencyMismatchError', () => new CurrencyMismatchError('USD', 'GTQ'),
    { status: 409, code: 'CURRENCY_MISMATCH', message: 'Currency mismatch: recommendation=USD event=GTQ', details: [d('recommendation_currency', 'USD'), d('event_currency', 'GTQ')] }],
  ['InvalidValueError', () => new InvalidValueError('amount must be >= 0'),
    { status: 400, code: 'INVALID_VALUE', message: 'amount must be >= 0', details: [d('editedPayload', 'amount must be >= 0')] }],
  ['PayloadInvalidError', () => new PayloadInvalidError('missing items'),
    { status: 422, code: 'PAYLOAD_INVALID', message: 'Recommendation payload invalid: missing items', details: [d('output_payload', 'missing items')] }],

  // ── vendor-management ─────────────────────────────────────────────────────
  ['VendorProfileAlreadyExistsError', () => new VendorProfileAlreadyExistsError('m:ProfileExists'), { status: 409, code: 'PROFILE_EXISTS', message: 'm:ProfileExists' }],
  ['VendorProfileNotFoundError', () => new VendorProfileNotFoundError('m:ProfileNF'), { status: 404, code: 'PROFILE_NOT_FOUND', message: 'm:ProfileNF' }],
  ['VendorProfileRejectedError', () => new VendorProfileRejectedError('m:ProfileRejected'), { status: 409, code: 'PROFILE_REJECTED', message: 'm:ProfileRejected' }],
  ['VendorProfileHiddenError', () => new VendorProfileHiddenError('m:ProfileHidden'), { status: 409, code: 'PROFILE_HIDDEN', message: 'm:ProfileHidden' }],
  ['VendorProfileAlreadyDeletedError', () => new VendorProfileAlreadyDeletedError('m:ProfileDeleted'), { status: 409, code: 'PROFILE_DELETED', message: 'm:ProfileDeleted' }],
  ['CategoryChangeLimitError', () => new CategoryChangeLimitError('m:CatChange'), { status: 409, code: 'CATEGORY_CHANGE_LIMIT', message: 'm:CatChange' }],
  ['InvalidCategoriesError', () => new InvalidCategoriesError('m:Categories'), { status: 400, code: 'INVALID_CATEGORIES', message: 'm:Categories' }],
  ['InvalidCategoryError', () => new InvalidCategoryError(['id-1', 'id-2'], 'm:Category'),
    { status: 400, code: 'INVALID_CATEGORY', message: 'm:Category', details: [d('service_category_ids', 'id-1'), d('service_category_ids', 'id-2')] }],
  ['InvalidCategoryError vacío', () => new InvalidCategoryError([]), { status: 400, code: 'INVALID_CATEGORY', message: 'One or more categories are unknown or inactive' }],
  ['InvalidPackageNameError', () => new InvalidPackageNameError('m:Package'), { status: 400, code: 'INVALID_PACKAGE_NAME', message: 'm:Package' }],
  ['InvalidPriceError', () => new InvalidPriceError('m:Price'), { status: 400, code: 'INVALID_PRICE', message: 'm:Price' }],
  ['InvalidCurrencyError', () => new InvalidCurrencyError('m:CurrencyCode'), { status: 400, code: 'INVALID_CURRENCY', message: 'm:CurrencyCode' }],
  ['InvalidDescriptionError', () => new InvalidDescriptionError('m:Description'), { status: 400, code: 'INVALID_DESCRIPTION', message: 'm:Description' }],
  ['VendorServiceLimitReachedError', () => new VendorServiceLimitReachedError('m:ServiceLimit'), { status: 409, code: 'SERVICE_LIMIT_REACHED', message: 'm:ServiceLimit' }],
  ['VendorServiceNotFoundError', () => new VendorServiceNotFoundError('m:ServiceNF'), { status: 404, code: 'SERVICE_NOT_FOUND', message: 'm:ServiceNF' }],
  ['InvalidFiltersError', () => new InvalidFiltersError(['city', 'price_max']),
    { status: 400, code: 'INVALID_FILTERS', message: 'Invalid search filters', details: [d('city', 'invalid'), d('price_max', 'invalid')] }],
  ['InvalidFiltersError vacío', () => new InvalidFiltersError([]), { status: 400, code: 'INVALID_FILTERS', message: 'Invalid search filters' }],
  ['InvalidCursorError', () => new InvalidCursorError(), { status: 400, code: 'INVALID_CURSOR', message: 'Invalid pagination cursor' }],

  // ── attachments ───────────────────────────────────────────────────────────
  ['PortfolioProfileNotFoundError', () => new PortfolioProfileNotFoundError('m:PortfolioNF'), { status: 404, code: 'PROFILE_NOT_FOUND', message: 'm:PortfolioNF' }],
  ['PortfolioProfileHiddenError', () => new PortfolioProfileHiddenError('m:PortfolioHidden'), { status: 409, code: 'PROFILE_HIDDEN', message: 'm:PortfolioHidden' }],
  ['InvalidMimeError', () => new InvalidMimeError('m:Mime'), { status: 400, code: 'INVALID_MIME', message: 'm:Mime' }],
  ['InvalidImageError', () => new InvalidImageError('m:Image'), { status: 400, code: 'INVALID_IMAGE', message: 'm:Image' }],
  ['InvalidWorkLabelError', () => new InvalidWorkLabelError('m:WorkLabel'), { status: 400, code: 'INVALID_WORK_LABEL', message: 'm:WorkLabel' }],
  ['ImageLimitReachedError', () => new ImageLimitReachedError('m:ImageLimit'), { status: 409, code: 'IMAGE_LIMIT_REACHED', message: 'm:ImageLimit' }],
  ['WorkLabelLimitReachedError', () => new WorkLabelLimitReachedError('m:WorkLabelLimit'), { status: 409, code: 'WORK_LABEL_LIMIT_REACHED', message: 'm:WorkLabelLimit' }],
  ['FileTooLargeError', () => new FileTooLargeError('m:FileTooLarge'), { status: 413, code: 'FILE_TOO_LARGE', message: 'm:FileTooLarge' }],
  ['AttachmentNotFoundError', () => new AttachmentNotFoundError('m:AttachmentNF'), { status: 404, code: 'ATTACHMENT_NOT_FOUND', message: 'm:AttachmentNF' }],
  ['InvalidDeletionReasonError', () => new InvalidDeletionReasonError('m:DeletionReason'), { status: 400, code: 'INVALID_DELETION_REASON', message: 'm:DeletionReason' }],

  // ── Errores no-AppError ───────────────────────────────────────────────────
  ['body-parser entity.too.large', () => Object.assign(new Error('request entity too large'), { type: 'entity.too.large', status: 413 }),
    { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request payload too large' }],
  ['body-parser entity.parse.failed', () => Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed', status: 400 }),
    { status: 400, code: 'BAD_REQUEST', message: 'Invalid request body' }],
  ['body-parser encoding.unsupported', () => Object.assign(new Error('unsupported charset'), { type: 'encoding.unsupported' }),
    { status: 400, code: 'BAD_REQUEST', message: 'Invalid request body' }],
  ['body-parser request.aborted', () => Object.assign(new Error('request aborted'), { type: 'request.aborted' }),
    { status: 400, code: 'BAD_REQUEST', message: 'Invalid request body' }],
  ['objeto plano con type body-parser', () => ({ type: 'entity.parse.failed' }), { status: 400, code: 'BAD_REQUEST', message: 'Invalid request body' }],
  ['error con type desconocido', () => Object.assign(new Error('other'), { type: 'stream.not.readable' }), INTERNAL],
  ['Error genérico', () => new Error('secret internal detail'), INTERNAL],
  ['TypeError', () => new TypeError('cannot read x of undefined'), INTERNAL],
  ['ZodError', () => z.object({ a: z.string() }).safeParse({ a: 1 }).error as ZodError, INTERNAL],
  ['string lanzado', () => 'boom-string', INTERNAL],
  ['objeto plano sin type', () => ({ foo: 'bar' }), INTERNAL],
];

// Un solo server en 127.0.0.1 (no en `::`): evita que otro proceso local que escuche en el mismo
// puerto IPv4 responda en lugar de la app de prueba.
let currentError: unknown;
let server: Server;

beforeAll(async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.correlationId = CORRELATION_ID;
    next();
  });
  app.get(PATH, (_req, _res, next) => next(currentError));
  app.use(errorHandlerMiddleware);
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

function expectedLog(err: unknown, exp: Expected): { level: 'warn' | 'error'; payload: Record<string, unknown> } {
  if (exp.status >= 500) {
    return {
      level: 'error',
      payload: {
        event: 'unexpected_error',
        correlationId: CORRELATION_ID,
        method: 'GET',
        path: PATH,
        httpStatus: exp.status,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    };
  }
  if (exp.masked) {
    return {
      level: 'warn',
      payload: { event: 'authorization_masked_as_404', correlationId: CORRELATION_ID, method: 'GET', path: PATH, realStatus: 403 },
    };
  }
  return {
    level: 'warn',
    payload: { event: 'domain_error', correlationId: CORRELATION_ID, code: exp.code, httpStatus: exp.status, method: 'GET', path: PATH },
  };
}

describe('caracterización error → HTTP (errorHandlerMiddleware)', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no hay casos duplicados', () => {
    const names = CASES.map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(CASES)('%s', async (_name, make, exp) => {
    const err = make();
    currentError = err;
    const res = await request(server).get(PATH);

    // Respuesta: status + body byte a byte (orden de claves incluido) + Retry-After.
    expect(res.status).toBe(exp.status);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
    const body: { error: Record<string, unknown> } = {
      error: { code: exp.code, message: exp.message, correlationId: CORRELATION_ID },
    };
    if (exp.details) body.error.details = exp.details;
    expect(res.text).toBe(JSON.stringify(body));
    expect(res.headers['retry-after']).toBe(exp.retryAfter);

    // Log: un único evento, con nivel y campos exactos.
    const log = expectedLog(err, exp);
    const [used, unused] = log.level === 'error' ? [error, warn] : [warn, error];
    expect(unused).not.toHaveBeenCalled();
    expect(used).toHaveBeenCalledTimes(1);
    expect(used.mock.calls[0]).toEqual([log.payload]);
    expect(Object.keys(used.mock.calls[0]?.[0] as object)).toEqual(Object.keys(log.payload));
  });
});
