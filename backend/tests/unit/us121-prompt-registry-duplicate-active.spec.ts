// US-121 / QA-002 (AC-03, AC-10) — duplicate active rejection. El registry falla fast cuando hay
// dos prompts active para el mismo (featureType, languageCode). Verifica error tipado y metadata
// segura (sin contenido de prompt). Registry construido con fixtures aisladas.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PromptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry.js';
import { PromptDuplicateActiveError } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { makeTemplate } from '../helpers/prompt-fixtures.js';

afterEach(() => vi.restoreAllMocks());

describe('US-121 AC-03 — duplicate active por (featureType, languageCode) falla fast', () => {
  it('lanza PromptDuplicateActiveError al construir el registry', () => {
    const build = () =>
      PromptRegistry.build([
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V1', status: 'active' }),
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V2', status: 'active' }),
      ]);
    expect(build).toThrow(PromptDuplicateActiveError);
  });

  it('no hay fallback silencioso: la construcción no "elige" un ganador', () => {
    let error: unknown;
    try {
      PromptRegistry.build([
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V1', status: 'active' }),
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V2', status: 'active' }),
      ]);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(PromptDuplicateActiveError);
    const meta = (error as PromptDuplicateActiveError).meta;
    // Metadata segura: sólo IDs/feature/idioma, nunca contenido de prompt.
    expect(meta.featureType).toBe('event_plan');
    expect(meta.languageCode).toBe('es-LATAM');
    expect(JSON.stringify(meta)).not.toContain('assistant');
  });

  it('emite log de validación seguro con errorCode', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      PromptRegistry.build([
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V1', status: 'active' }),
        makeTemplate({ promptKey: 'event_plan.es-LATAM', version: 'V2', status: 'active' }),
      ]);
    } catch {
      /* esperado */
    }
    expect(warn).toHaveBeenCalledWith(
      'ai.prompt_registry.validation_failed',
      expect.objectContaining({ errorCode: 'PROMPT_DUPLICATE_ACTIVE' }),
    );
  });

  it('active en distintos idiomas del mismo feature NO es duplicado', () => {
    const build = () =>
      PromptRegistry.build([
        makeTemplate({ promptKey: 'event_plan.es-LATAM', languageSupport: ['es-LATAM'], version: 'V1', status: 'active' }),
        makeTemplate({ promptKey: 'event_plan.en', languageSupport: ['en'], version: 'V1', status: 'active' }),
      ]);
    expect(build).not.toThrow();
  });
});
