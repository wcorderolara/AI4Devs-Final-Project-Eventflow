// US-021 / QA-001 (AI-002, AC-01/AC-03) — MockAIProvider `quote_brief` determinista por idioma.
// Valida schema evolucionado (`brief ≤ 2000`, ítems ≤ 240, máx. 10 por array; requirements/questions
// no vacíos), invariantes por idioma y ausencia de PII del organizador en la base determinista.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { detectOrganizerPii } from '../../src/modules/ai-assistance/application/ai-generation.service.js';

const provider = new MockAIProvider();
const LANGS = ['es-LATAM', 'en', 'es-ES', 'pt'] as const;

describe('US-021 AI-002 — Mock `quote_brief` cumple el schema evolucionado en 4 locales', () => {
  it('cada idioma retorna output válido contra `OUTPUT_SCHEMAS.quote_brief`', async () => {
    for (const lang of LANGS) {
      const r = await provider.generate({ feature: 'quote_brief', input: { guests: 100 }, languageCode: lang });
      const parsed = OUTPUT_SCHEMAS.quote_brief.safeParse(r.output);
      expect(parsed.success, `lang ${lang} — ${!parsed.success ? JSON.stringify(parsed.error.issues) : ''}`).toBe(true);
    }
  });

  it('invariantes: `brief` ≤ 2000, ítems ≤ 240, cardinalidad ≤ 10, `requirements`/`questions` no vacíos', async () => {
    for (const lang of LANGS) {
      const r = await provider.generate({ feature: 'quote_brief', input: { guests: 100 }, languageCode: lang });
      const out = r.output as {
        brief: string;
        requirements: string[];
        questions: string[];
        constraints: string[];
      };
      expect(out.brief.length).toBeLessThanOrEqual(2000);
      expect(out.brief.length).toBeGreaterThan(0);
      for (const arr of [out.requirements, out.questions, out.constraints]) {
        expect(arr.length).toBeLessThanOrEqual(10);
        for (const item of arr) expect(item.length).toBeLessThanOrEqual(240);
      }
      expect(out.requirements.length).toBeGreaterThanOrEqual(1);
      expect(out.questions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('US-021 AI-002 — determinismo y ausencia de PII del organizador en la base determinista', () => {
  it('mismo (feature, languageCode) retorna outputs deep-equal', async () => {
    for (const lang of LANGS) {
      const r1 = await provider.generate({ feature: 'quote_brief', input: { guests: 100 }, languageCode: lang });
      const r2 = await provider.generate({ feature: 'quote_brief', input: { guests: 100 }, languageCode: lang });
      expect(r1.output).toEqual(r2.output);
    }
  });

  it('la salida base no contiene email/teléfono/dirección postal del organizador (detector puro)', async () => {
    for (const lang of LANGS) {
      const r = await provider.generate({ feature: 'quote_brief', input: { guests: 100 }, languageCode: lang });
      const scan = detectOrganizerPii(r.output);
      expect(scan.ok, `lang ${lang} — matches ${scan.matches.join(',')}`).toBe(true);
      expect(scan.matches).toEqual([]);
    }
  });
});
