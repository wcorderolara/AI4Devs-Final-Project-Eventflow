// PromptRegistry — errores tipados (US-121 / BE-001, SEC-002). Extienden `AppError` con `code`
// estable del catálogo shared. NUNCA incluyen prompt completo, input completo, secrets ni PII
// (SEC-02/SEC-04): sólo metadata segura (`featureType`, `languageCode`, `promptKey`, `version`,
// `errorCode`). US-121 no crea endpoints; el mapping a HTTP (si aplica) ocurriría en use cases
// consumidores futuros vía `errorHandlerMiddleware`.
import { AppError } from '../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../shared/domain/errors/error-codes.js';

/** Metadata SEGURA adjunta a errores de registry (sin contenido de prompt ni payload). */
export interface PromptRegistryErrorMeta {
  featureType?: string;
  languageCode?: string;
  promptKey?: string;
  version?: string;
}

/** Base de errores del registry: transporta metadata segura para logs/observabilidad (OBS-001). */
export abstract class PromptRegistryError extends AppError {
  constructor(
    message: string,
    readonly meta: PromptRegistryErrorMeta = {},
  ) {
    super(message);
  }
}

/** AC-04 / EC-04: resolución sin match (feature o versión inexistente). */
export class PromptNotFoundError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_NOT_FOUND;
}

/** AC-03 / EC-01 / VR-02: más de una versión active por `(featureType, languageCode)`. */
export class PromptDuplicateActiveError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_DUPLICATE_ACTIVE;
}

/** AC-04 / EC-04 / VR-05: `languageCode` fuera de los idiomas soportados. Sin fallback silencioso. */
export class PromptUnsupportedLanguageError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_UNSUPPORTED_LANGUAGE;
}

/** AC-05 / VR-01/VR-03/VR-04: metadata obligatoria, schema refs o safety constraints incompletos. */
export class PromptInvalidMetadataError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_INVALID_METADATA;
}

/** AC-08 / VR-06: el hash declarado no coincide con el contenido (mutación sin nueva versión). */
export class PromptHashDriftError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_HASH_DRIFT;
}

/** AC-09 / VR-08: un prompt de feature Future/P4 fuera del MVP quedó marcado `active`. */
export class PromptFutureFeatureActiveError extends PromptRegistryError {
  readonly code = ErrorCodes.PROMPT_FUTURE_FEATURE_ACTIVE;
}
