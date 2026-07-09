// Errores controlados de persistencia de AIRecommendation (US-122 / BE-005). Backend-only infra.
// Extienden `AppError` con `code` estable del catálogo shared. NUNCA incluyen payload completo,
// prompt completo, raw provider output, secrets ni PII (SEC-05): sólo metadata segura.
// US-122 no crea endpoints; el mapping a HTTP (si aplica) ocurriría en use cases consumidores.
import { AppError } from '../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../shared/domain/errors/error-codes.js';

/** Metadata SEGURA adjunta a errores de persistencia (sin contenido de payload/output). */
export interface AIRecommendationErrorMeta {
  type?: string;
  provider?: string;
  promptVersionId?: string;
  correlationId?: string;
}

export abstract class AIRecommendationPersistenceBaseError extends AppError {
  constructor(
    message: string,
    readonly meta: AIRecommendationErrorMeta = {},
  ) {
    super(message);
  }
}

/** VR-01..VR-05 / VR-09: metadata requerida ausente o inválida (user, type, provider, language, fallback). */
export class AIRecommendationValidationError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_RECOMMENDATION_VALIDATION;
}

/** AC-03 / EC-01 / VR-01: `promptVersionId` ausente o no existe en `AIPromptVersion`. */
export class AIPromptVersionNotFoundError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_PROMPT_VERSION_NOT_FOUND;
}

/** AC-06 / EC-03 / VR-07: el `inputPayload` no pudo sanitizarse a un shape seguro. */
export class AIRecommendationUnsafePayloadError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_RECOMMENDATION_UNSAFE_PAYLOAD;
}

/** AC-07 / EC-02 / VR-06: el `outputPayload` no está validado por schema; no se persiste como success. */
export class AIRecommendationInvalidOutputError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_RECOMMENDATION_INVALID_OUTPUT;
}

/** AC-09 / EC-05: falta un context ID requerido por el `AIRecommendationType`. */
export class AIRecommendationContextError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_RECOMMENDATION_CONTEXT;
}

/** Fallo en la capa de persistencia (DB/Prisma) tras validación. */
export class AIRecommendationPersistenceError extends AIRecommendationPersistenceBaseError {
  readonly code = ErrorCodes.AI_RECOMMENDATION_PERSISTENCE;
}
