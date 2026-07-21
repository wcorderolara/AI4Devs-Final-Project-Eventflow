// US-084 (PB-P1-049 / QA-001 · AC-02) — Helper LOCALE_LABEL + composeLocaleInstruction.
// Verifica que existe una etiqueta humana por locale de la whitelist y que la instrucción
// sistémica siga el formato acordado (prefijo `IMPORTANTE:`, cierre `\n\n`, nombre de idioma).
import { describe, it, expect } from 'vitest';
import {
  LOCALE_LABEL,
  composeLocaleInstruction,
} from '../../src/shared/i18n/locale-label.js';
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../src/shared/constants/languages.js';

describe('US-084 QA-001 — LOCALE_LABEL', () => {
  it('cubre la whitelist completa `SUPPORTED_LANGUAGES` sin sobrantes ni faltantes', () => {
    const keys = Object.keys(LOCALE_LABEL).sort();
    const supported = [...SUPPORTED_LANGUAGES].sort();
    expect(keys).toEqual(supported);
  });

  it('cada label es un string no vacío en el idioma canónico del locale', () => {
    for (const locale of SUPPORTED_LANGUAGES) {
      const label = LOCALE_LABEL[locale as SupportedLanguage];
      expect(typeof label).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
    }
    // Sanity checks del contrato (útiles para catch regresiones silenciosas del texto).
    expect(LOCALE_LABEL['es-LATAM']).toContain('latino');
    expect(LOCALE_LABEL['es-ES']).toContain('España');
    expect(LOCALE_LABEL.pt).toContain('português');
    expect(LOCALE_LABEL.en).toBe('English');
  });
});

describe('US-084 QA-001 — composeLocaleInstruction', () => {
  it('produce un bloque con IMPORTANTE + nombre humano + cierre en doble salto', () => {
    for (const locale of SUPPORTED_LANGUAGES) {
      const out = composeLocaleInstruction(locale as SupportedLanguage);
      expect(out.startsWith('IMPORTANTE: Responde estrictamente en ')).toBe(true);
      expect(out).toContain(LOCALE_LABEL[locale as SupportedLanguage]);
      expect(out.endsWith('\n\n')).toBe(true);
      // Directiva anti-mezcla explícita del contrato.
      expect(out).toMatch(/No mezcles idiomas/);
    }
  });

  it('es puro — llamadas repetidas con el mismo locale dan el mismo output byte-a-byte', () => {
    const a = composeLocaleInstruction('pt');
    const b = composeLocaleInstruction('pt');
    expect(a).toBe(b);
  });
});
