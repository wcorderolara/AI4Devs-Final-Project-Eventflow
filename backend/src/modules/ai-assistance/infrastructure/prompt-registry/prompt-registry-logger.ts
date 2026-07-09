// PromptRegistry — logging seguro de fallas de validación/resolución (US-121 / OBS-001, SEC-002).
// Evento canónico `ai.prompt_registry.validation_failed`. SÓLO metadata segura: `featureType`,
// `languageCode`, `promptKey`, `version`, `errorCode`. PROHIBIDO: prompt completo, user payload,
// secrets, PII (SEC-04). Reusa el logger shared (que además pasa todo por `redact()`).
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import type { PromptRegistryError } from './prompt-registry-errors.js';

export const PROMPT_REGISTRY_VALIDATION_FAILED_EVENT = 'ai.prompt_registry.validation_failed';

/** Campos seguros emitidos ante una falla de validación/resolución del registry. */
export interface PromptRegistrySafeLogFields {
  event: string;
  errorCode: string;
  featureType?: string;
  languageCode?: string;
  promptKey?: string;
  version?: string;
}

/** Construye el payload seguro (sin contenido de prompt) a partir de un error del registry. */
export function toSafeLogFields(error: PromptRegistryError): PromptRegistrySafeLogFields {
  return {
    event: PROMPT_REGISTRY_VALIDATION_FAILED_EVENT,
    errorCode: error.code,
    featureType: error.meta.featureType,
    languageCode: error.meta.languageCode,
    promptKey: error.meta.promptKey,
    version: error.meta.version,
  };
}

/** Emite un `logger.warn` con sólo metadata segura para una falla del registry. */
export function logPromptRegistryValidationFailed(error: PromptRegistryError): void {
  logger.warn(PROMPT_REGISTRY_VALIDATION_FAILED_EVENT, toSafeLogFields(error));
}
