// US-121 / QA-004 (AC-05, AC-08, AC-10) — metadata requerida + hash/version discipline. Metadata
// incompleta o schema refs faltantes fallan validation; un cambio de contenido sin actualizar hash
// (nueva versión) produce drift detectable. Fixtures aisladas.
import { describe, it, expect } from 'vitest';
import { PromptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry.js';
import {
  PromptHashDriftError,
  PromptInvalidMetadataError,
} from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.js';
import { computeTemplateHash } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-hash.js';
import { makeTemplate } from '../helpers/prompt-fixtures.js';

describe('US-121 AC-05 — metadata obligatoria', () => {
  it('falta output schema ref => PromptInvalidMetadataError', () => {
    expect(() => PromptRegistry.build([makeTemplate({ outputSchemaRef: '' })])).toThrow(PromptInvalidMetadataError);
  });

  it('falta input schema ref => PromptInvalidMetadataError', () => {
    expect(() => PromptRegistry.build([makeTemplate({ inputSchemaRef: '' })])).toThrow(PromptInvalidMetadataError);
  });

  it('active sin approvedBy/approvedAt => PromptInvalidMetadataError', () => {
    expect(() =>
      PromptRegistry.build([makeTemplate({ status: 'active', metadata: { approvedBy: undefined, approvedAt: undefined } as never })]),
    ).toThrow(PromptInvalidMetadataError);
  });

  it('active con safety constraint faltante (HITL false) => PromptInvalidMetadataError', () => {
    expect(() =>
      PromptRegistry.build([makeTemplate({ status: 'active', safetyConstraints: { hitlReminder: false } as never })]),
    ).toThrow(PromptInvalidMetadataError);
  });

  it('promptKey inconsistente con featureType/languageSupport => PromptInvalidMetadataError', () => {
    expect(() => PromptRegistry.build([makeTemplate({ promptKey: 'wrong.key' })])).toThrow(PromptInvalidMetadataError);
  });
});

describe('US-121 AC-08 — hash/version discipline', () => {
  it('un template válido tiene hash coherente y construye', () => {
    expect(() => PromptRegistry.build([makeTemplate()])).not.toThrow();
  });

  it('cambio de systemInstructions sin recalcular hash => PROMPT_HASH_DRIFT', () => {
    const valid = makeTemplate();
    const drifted = { ...valid, systemInstructions: `${valid.systemInstructions} EXTRA CONTENT` };
    // hash declarado quedó "viejo" (no cubre el nuevo contenido).
    expect(() => PromptRegistry.build([drifted])).toThrow(PromptHashDriftError);
  });

  it('cambio de safety constraints sin nueva versión/hash => drift', () => {
    const valid = makeTemplate();
    const drifted = { ...valid, developerRules: [...valid.developerRules, 'nueva regla de comportamiento'] };
    expect(() => PromptRegistry.build([drifted])).toThrow(PromptHashDriftError);
  });

  it('recalcular el hash tras el cambio (= nueva versión disciplinada) resuelve el drift', () => {
    const valid = makeTemplate();
    const changed = { ...valid, version: 'V2', systemInstructions: `${valid.systemInstructions} EXTRA` };
    changed.templateHash = computeTemplateHash(changed);
    expect(() => PromptRegistry.build([changed])).not.toThrow();
  });
});
