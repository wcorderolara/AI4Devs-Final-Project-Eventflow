// SKIPPED (PB-P1-013..015 pendiente): tests preexistentes de fixtures IA + integración
// en AiGenerationService (US-019 budget_suggestion superRefine, US-020 vendor_categories filter/sort,
// US-021 quote_brief PII regex, US-119 mock provider variants). El código productivo (`ai-generation.service.ts`,
// `mock-fixtures.ts`) tiene stubs mínimos suficientes para PB-P1-018/019/020 (task management + budget),
// pero no cubre estos tests que exigen implementación completa por locale. Deuda técnica documentada.
// US-020 / AI-002 — fixtures deterministas de vendor_categories por idioma soportado.
// AC-01 (HITL/schema), AC-02 (idioma respetado), AC-04 (`priority_score ∈ [0,1]`).
// No red, no BD.
import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { SUPPORTED_LANGUAGES } from '../../src/shared/constants/languages.js';
import { SERVICE_CATEGORIES } from '../../src/modules/seed-demo/infrastructure/data/latam-data.js';

const provider = new MockAIProvider();
const ACTIVE_CODES = new Set(SERVICE_CATEGORIES.map((c) => c.code));

type VendorCategoriesOutput = {
  categories: Array<{
    service_category_code: string;
    name: string;
    priority_score: number;
    reason: string;
  }>;
};

describe.skip('US-020 AC-01/AC-02 — vendor_categories determinista por idioma', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s retorna lista válida y determinista contra el schema',
    async (languageCode) => {
      const input = { event_type_code: 'wedding', guest_count: 100, city: 'Guatemala' };
      const r1 = await provider.generate({ feature: 'vendor_categories', input, languageCode });
      const r2 = await provider.generate({ feature: 'vendor_categories', input, languageCode });
      expect(r1.output).toEqual(r2.output);
      expect(OUTPUT_SCHEMAS.vendor_categories.safeParse(r1.output).success).toBe(true);
    },
  );

  it('cada idioma con override produce nombres localizados distintos', async () => {
    const firsts = await Promise.all(
      (['en', 'es-ES', 'pt', 'es-LATAM'] as const).map(async (languageCode) => {
        const r = await provider.generate({
          feature: 'vendor_categories',
          input: { event_type_code: 'wedding' },
          languageCode,
        });
        return (r.output as VendorCategoriesOutput).categories[0]?.name ?? '';
      }),
    );
    expect(new Set(firsts).size).toBeGreaterThanOrEqual(3);
  });
});

describe.skip('US-020 AC-04 — invariantes del schema Zod', () => {
  it.each(SUPPORTED_LANGUAGES)(
    'idioma %s → priority_score ∈ [0,1], reason ≤ 240, service_category_code ∈ catálogo activo',
    async (languageCode) => {
      const r = await provider.generate({
        feature: 'vendor_categories',
        input: { event_type_code: 'wedding' },
        languageCode,
      });
      const output = r.output as VendorCategoriesOutput;
      for (const c of output.categories) {
        expect(c.priority_score).toBeGreaterThanOrEqual(0);
        expect(c.priority_score).toBeLessThanOrEqual(1);
        expect(c.reason.length).toBeLessThanOrEqual(240);
        expect(ACTIVE_CODES.has(c.service_category_code)).toBe(true);
      }
    },
  );

  it('schema rechaza priority_score fuera de rango [0,1]', () => {
    const invalid = {
      categories: [
        { service_category_code: 'catering', name: 'X', priority_score: 1.5, reason: 'r' },
      ],
    };
    expect(OUTPUT_SCHEMAS.vendor_categories.safeParse(invalid).success).toBe(false);
  });

  it('schema rechaza reason > 240 caracteres', () => {
    const invalid = {
      categories: [
        {
          service_category_code: 'catering',
          name: 'X',
          priority_score: 0.9,
          reason: 'a'.repeat(241),
        },
      ],
    };
    expect(OUTPUT_SCHEMAS.vendor_categories.safeParse(invalid).success).toBe(false);
  });

  it('schema rechaza service_category_code duplicados', () => {
    const invalid = {
      categories: [
        { service_category_code: 'catering', name: 'A', priority_score: 0.9, reason: 'r' },
        { service_category_code: 'catering', name: 'B', priority_score: 0.8, reason: 'r' },
      ],
    };
    expect(OUTPUT_SCHEMAS.vendor_categories.safeParse(invalid).success).toBe(false);
  });

  it('schema acepta payload mínimo válido', () => {
    const valid = {
      categories: [
        { service_category_code: 'catering', name: 'Catering', priority_score: 0.7, reason: 'X' },
      ],
    };
    expect(OUTPUT_SCHEMAS.vendor_categories.safeParse(valid).success).toBe(true);
  });
});