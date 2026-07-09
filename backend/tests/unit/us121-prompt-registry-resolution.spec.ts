// US-121 / QA-001 (AC-01, AC-02, AC-10) — resolución active y specific del PromptRegistry.
// Verifica que active retorna exactamente una versión activa, que specific reproduce versiones
// históricas (deprecated) y que deprecated NO aparece en active resolution. Sin red ni secrets.
import { describe, it, expect } from 'vitest';
import { PromptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import { makeTemplate } from '../helpers/prompt-fixtures.js';

describe('US-121 AC-01 — active resolution retorna exactamente un template activo', () => {
  it('resuelve el active vigente (event_plan es-LATAM => V2)', () => {
    const t = promptRegistry.resolveActive('event_plan', 'es-LATAM');
    expect(t.status).toBe('active');
    expect(t.stableId).toBe('event_plan.es-LATAM@V2');
  });

  it('el template resuelto incluye metadata requerida (ID, version, feature, status, schemas, hash, changelog)', () => {
    const t = promptRegistry.resolveActive('checklist', 'es-LATAM');
    expect(t.stableId).toBe('checklist.es-LATAM@V1');
    expect(t.version).toBe('V1');
    expect(t.featureType).toBe('checklist');
    expect(t.status).toBe('active');
    expect(t.languageSupport).toEqual(['es-LATAM']);
    expect(t.inputSchemaRef).toBeTruthy();
    expect(t.outputSchemaRef).toBeTruthy();
    expect(t.templateHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(t.metadata.changeReason).toBeTruthy();
  });

  it('soporta resolución multi-idioma (event_plan en => activo en inglés)', () => {
    const t = promptRegistry.resolveActive('event_plan', 'en');
    expect(t.status).toBe('active');
    expect(t.stableId).toBe('event_plan.en@V1');
  });
});

describe('US-121 AC-02 — specific resolution reproduce versiones históricas', () => {
  it('resuelve una versión deprecated por (feature, language, version) para replay', () => {
    const t = promptRegistry.resolveSpecific('event_plan', 'es-LATAM', 'V1');
    expect(t.stableId).toBe('event_plan.es-LATAM@V1');
    expect(t.status).toBe('deprecated');
  });

  it('resuelve por stableId directo', () => {
    const t = promptRegistry.resolveSpecificById('event_plan.es-LATAM@V2');
    expect(t.status).toBe('active');
  });

  it('deprecated/archived NO se seleccionan por active resolution (active ≠ V1)', () => {
    const active = promptRegistry.resolveActive('event_plan', 'es-LATAM');
    expect(active.version).not.toBe('V1');
    expect(active.version).toBe('V2');
  });
});

describe('US-121 AC-01/AC-02 — registry aislado con fixtures controladas', () => {
  it('active único + versión deprecated conviven; active devuelve la vigente', () => {
    const registry = PromptRegistry.build([
      makeTemplate({ promptKey: 'checklist.es-LATAM', featureType: 'checklist', version: 'V1', status: 'deprecated', inputSchemaRef: 'ai.checklist.input.v1', outputSchemaRef: 'ai.checklist.output.v1' }),
      makeTemplate({ promptKey: 'checklist.es-LATAM', featureType: 'checklist', version: 'V2', status: 'active', inputSchemaRef: 'ai.checklist.input.v1', outputSchemaRef: 'ai.checklist.output.v1' }),
    ]);
    expect(registry.resolveActive('checklist', 'es-LATAM').version).toBe('V2');
    expect(registry.resolveSpecific('checklist', 'es-LATAM', 'V1').status).toBe('deprecated');
  });
});
