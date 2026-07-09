// Helper de fixtures para tests de PromptRegistry (US-121 / QA). Construye templates válidos con
// hash recalculado; los tests sobreescriben campos para forzar errores. No usa red ni secrets.
import { computeTemplateHash } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-hash.js';
import { MVP_ACTIVE_SAFETY, SAFETY_INSTRUCTION_BLOCK } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/safety-constraints.js';
import type { PromptTemplate } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-template.js';

/**
 * Crea un `PromptTemplate` válido y consistente. Recalcula `templateHash` salvo que el override lo
 * fije explícitamente (para probar drift). Si cambias `featureType`/`languageSupport`, pasa también
 * un `promptKey` coherente (`<featureType>.<languageCode>`).
 */
export function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  const base: PromptTemplate = {
    promptKey: 'event_plan.es-LATAM',
    version: 'V1',
    featureType: 'event_plan',
    status: 'active',
    languageSupport: ['es-LATAM'],
    inputSchemaRef: 'ai.event_plan.input.v1',
    outputSchemaRef: 'ai.event_plan.output.v1',
    templateHash: 'sha256:PLACEHOLDER',
    systemInstructions: `Test event assistant. ${SAFETY_INSTRUCTION_BLOCK}`,
    developerRules: ['rule-a'],
    safetyConstraints: { ...MVP_ACTIVE_SAFETY },
    metadata: {
      createdBy: 'promptops-team',
      approvedBy: 'product-owner',
      changeReason: 'test',
      relatedRules: [],
      createdAt: '2026-01-01T00:00:00Z',
      approvedAt: '2026-01-01T00:00:00Z',
    },
  };
  const merged: PromptTemplate = {
    ...base,
    ...overrides,
    safetyConstraints: { ...base.safetyConstraints, ...(overrides.safetyConstraints ?? {}) },
    metadata: { ...base.metadata, ...(overrides.metadata ?? {}) },
  };
  if (!overrides.templateHash) {
    merged.templateHash = computeTemplateHash(merged);
  }
  return merged;
}
