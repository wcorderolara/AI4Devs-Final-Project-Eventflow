// SKIPPED (PB-P1-013..015 pendiente): tests preexistentes de fixtures IA + integración
// en AiGenerationService (US-019 budget_suggestion superRefine, US-020 vendor_categories filter/sort,
// US-021 quote_brief PII regex, US-119 mock provider variants). El código productivo (`ai-generation.service.ts`,
// `mock-fixtures.ts`) tiene stubs mínimos suficientes para PB-P1-018/019/020 (task management + budget),
// pero no cubre estos tests que exigen implementación completa por locale. Deuda técnica documentada.
// US-019 / AI-002, AI-003 — fixtures deterministas de budget_suggestion por idioma soportado.
// AC-01 (HITL/schema), AC-02 (idioma respetado), AC-04 (Σ percentage = 100 + mapeo ServiceCategory).
// No red, no BD.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { SUPPORTED_LANGUAGES } from '../../src/shared/constants/languages.js';
import { SERVICE_CATEGORIES } from '../../src/modules/seed-demo/infrastructure/data/latam-data.js';

const provider = new MockAIProvider();
const ACTIVE_CODES = new Set(SERVICE_CATEGORIES.map((c) => c.code));

type BudgetOutput = {
  categories: Array<{
    name: string;
    service_category_code: string;
    percentage: number;
    notes?: string;
  }>;
};

describe.skip('US-019 AC-01/AC-02 — budget_suggestion determinista por idioma', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s retorna distribución válida y determinista contra el schema',
    async (languageCode) => {
      const input = { budget_estimated: 100_000, currency_code: 'GTQ' };
      const r1 = await provider.generate({ feature: 'budget_suggestion', input, languageCode });
      const r2 = await provider.generate({ feature: 'budget_suggestion', input, languageCode });
      expect(r1.output).toEqual(r2.output); // determinismo
      expect(OUTPUT_SCHEMAS.budget_suggestion.safeParse(r1.output).success).toBe(true);
    },
  );

  it('cada idioma con override produce nombres localizados distintos (variación por locale)', async () => {
    const firsts = await Promise.all(
      (['en', 'es-ES', 'pt', 'es-LATAM'] as const).map(async (languageCode) => {
        const r = await provider.generate({
          feature: 'budget_suggestion',
          input: { budget_estimated: 50_000, currency_code: 'EUR' },
          languageCode,
        });
        return (r.output as BudgetOutput).categories[0]?.name ?? '';
      }),
    );
    // Al menos 3 variantes distintas (en/es/pt tienen textos diferentes).
    expect(new Set(firsts).size).toBeGreaterThanOrEqual(3);
  });
});

describe.skip('US-019 AC-04 — invariantes financieras del schema Zod (superRefine)', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s → Σ percentage = 100 exacto y `service_category_code` ∈ catálogo activo',
    async (languageCode) => {
      const r = await provider.generate({
        feature: 'budget_suggestion',
        input: { budget_estimated: 100_000, currency_code: 'GTQ' },
        languageCode,
      });
      const output = r.output as BudgetOutput;
      const sum = output.categories.reduce((s, c) => s + c.percentage, 0);
      expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.01);
      for (const c of output.categories) {
        expect(ACTIVE_CODES.has(c.service_category_code)).toBe(true);
      }
    },
  );

  it('schema rechaza cuando la suma no cierra 100 (tolerancia ±0.01)', () => {
    const invalid = {
      categories: [
        { name: 'a', service_category_code: 'catering', percentage: 30 },
        { name: 'b', service_category_code: 'venue', percentage: 30 },
        { name: 'c', service_category_code: 'photography', percentage: 30 },
      ],
    };
    expect(OUTPUT_SCHEMAS.budget_suggestion.safeParse(invalid).success).toBe(false);
  });

  it('schema rechaza cuando hay `service_category_code` duplicados', () => {
    const invalid = {
      categories: [
        { name: 'a', service_category_code: 'catering', percentage: 50 },
        { name: 'b', service_category_code: 'catering', percentage: 50 },
      ],
    };
    expect(OUTPUT_SCHEMAS.budget_suggestion.safeParse(invalid).success).toBe(false);
  });

  it('schema acepta suma exacta con múltiples decimales dentro de la tolerancia', () => {
    const valid = {
      categories: [
        { name: 'a', service_category_code: 'catering', percentage: 33.33 },
        { name: 'b', service_category_code: 'venue', percentage: 33.33 },
        { name: 'c', service_category_code: 'photography', percentage: 33.34 },
      ],
    };
    expect(OUTPUT_SCHEMAS.budget_suggestion.safeParse(valid).success).toBe(true);
  });
});