// PromptRegistry — barrel público del módulo PromptOps (US-121 / PB-P0-010, ADR-AI-006).
// Backend-only: sin endpoints, sin UI, sin edición dinámica (SEC-01/SEC-06). El registry por defecto
// `promptRegistry` se construye y VALIDA al importar (fail fast en bootstrap/tests).
export type {
  PromptTemplate,
  ResolvedPromptTemplate,
  PromptTemplateStatus,
  PromptVersionPolicy,
  PromptTemplateMetadata,
  PromptSafetyConstraints,
  AIPromptVersionMetadata,
} from './prompt-template.js';
export { promptStableId, REQUIRED_SAFETY_CONSTRAINTS } from './prompt-template.js';

export { PromptRegistry, type PromptResolveQuery } from './prompt-registry.js';
export {
  PromptRegistryError,
  PromptNotFoundError,
  PromptDuplicateActiveError,
  PromptUnsupportedLanguageError,
  PromptInvalidMetadataError,
  PromptHashDriftError,
  PromptFutureFeatureActiveError,
  type PromptRegistryErrorMeta,
} from './prompt-registry-errors.js';

export { computeTemplateHash, isTemplateHashValid } from './prompt-hash.js';
export { MVP_ACTIVE_SAFETY, hasAllSafetyConstraints, SAFETY_INSTRUCTION_BLOCK } from './safety-constraints.js';
export {
  MVP_ACTIVE_FEATURE_ALLOWLIST,
  FUTURE_FEATURE_TYPES,
  isMvpActiveFeature,
} from './mvp-feature-allowlist.js';
export {
  scanTemplateForSecretsAndPii,
  scanTemplatesForSecretsAndPii,
  type SecretPiiFinding,
} from './secret-pii-scan.js';
export {
  exportAIPromptVersionMetadata,
  AI_PROMPT_VERSION_NAMESPACE,
  type ExportOptions,
} from './aipromptversion-export.js';
export {
  PROMPT_REGISTRY_VALIDATION_FAILED_EVENT,
  logPromptRegistryValidationFailed,
  toSafeLogFields,
  type PromptRegistrySafeLogFields,
} from './prompt-registry-logger.js';

export { ALL_PROMPT_TEMPLATES } from './prompts/index.js';

import { PromptRegistry } from './prompt-registry.js';
import { ALL_PROMPT_TEMPLATES } from './prompts/index.js';

/** Registry por defecto del backend, construido y validado desde los templates MVP. */
export const promptRegistry: PromptRegistry = PromptRegistry.build(ALL_PROMPT_TEMPLATES);
