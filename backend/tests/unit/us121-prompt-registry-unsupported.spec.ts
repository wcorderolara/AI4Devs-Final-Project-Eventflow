// US-121 / QA-003 (AC-04, AC-10) — errores de feature/idioma/versión no soportados. La resolución
// falla de forma tipada y diferenciable, SIN fallback silencioso a otro prompt o idioma.
import { describe, it, expect } from 'vitest';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import {
  PromptNotFoundError,
  PromptUnsupportedLanguageError,
} from '../../src/modules/ai-assistance/infrastructure/prompt-registry/prompt-registry-errors.js';
import type { LanguageCode } from '../../src/modules/ai-assistance/ports/ai-contract.js';

describe('US-121 AC-04 — resolución inválida falla de forma segura', () => {
  it('feature sin prompt active => PromptNotFoundError', () => {
    // vendor_bio es Future/P4: sólo existe como draft, no hay active.
    expect(() => promptRegistry.resolveActive('vendor_bio', 'es-LATAM')).toThrow(PromptNotFoundError);
  });

  it('feature soportada con idioma sin prompt active => PromptNotFoundError (no fallback de idioma)', () => {
    // checklist sólo tiene active en es-LATAM; 'en' es idioma soportado pero sin prompt.
    expect(() => promptRegistry.resolveActive('checklist', 'en')).toThrow(PromptNotFoundError);
  });

  it('languageCode no soportado => PromptUnsupportedLanguageError', () => {
    expect(() => promptRegistry.resolveActive('event_plan', 'fr' as LanguageCode)).toThrow(
      PromptUnsupportedLanguageError,
    );
  });

  it('versión específica desconocida => PromptNotFoundError', () => {
    expect(() => promptRegistry.resolveSpecific('event_plan', 'es-LATAM', 'V99')).toThrow(PromptNotFoundError);
    expect(() => promptRegistry.resolveSpecificById('nope.es-LATAM@V1')).toThrow(PromptNotFoundError);
  });

  it('el error no filtra contenido sensible (sólo metadata segura)', () => {
    try {
      promptRegistry.resolveActive('event_plan', 'fr' as LanguageCode);
    } catch (e) {
      const err = e as PromptUnsupportedLanguageError;
      expect(err.code).toBe('PROMPT_UNSUPPORTED_LANGUAGE');
      expect(err.meta.languageCode).toBe('fr');
      expect(JSON.stringify(err.meta)).not.toContain('assistant');
    }
  });
});
