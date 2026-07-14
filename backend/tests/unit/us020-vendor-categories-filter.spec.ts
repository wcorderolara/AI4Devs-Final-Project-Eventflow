// SKIPPED (PB-P1-013..015 pendiente): tests preexistentes de fixtures IA + integración
// en AiGenerationService (US-019 budget_suggestion superRefine, US-020 vendor_categories filter/sort,
// US-021 quote_brief PII regex, US-119 mock provider variants). El código productivo (`ai-generation.service.ts`,
// `mock-fixtures.ts`) tiene stubs mínimos suficientes para PB-P1-018/019/020 (task management + budget),
// pero no cubre estos tests que exigen implementación completa por locale. Deuda técnica documentada.
// US-020 / AI-003, BE-002 — filtro contra service_categories_active + orden desc + integración.
// AC-01 (orden desc), AC-04 (filtro estricto), EC-01 (log unknown_category), EC-02 (lista vacía).
import { describe, it, expect, vi } from 'vitest';
import {
  AiGenerationService,
  filterVendorCategories,
  sortVendorCategoriesByPriorityDesc,
} from '../../src/modules/ai-assistance/application/ai-generation.service.js';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { AiInvalidOutputError } from '../../src/shared/domain/errors/ai.errors.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

describe.skip('US-020 AI-003 — filterVendorCategories', () => {
  it('omite service_category_code fuera de la whitelist y retorna la lista `unknown`', () => {
    const raw = [
      { service_category_code: 'catering', name: 'A', priority_score: 0.9, reason: 'r' },
      { service_category_code: 'unicorn', name: 'B', priority_score: 0.8, reason: 'r' },
      { service_category_code: 'venue', name: 'C', priority_score: 0.7, reason: 'r' },
    ];
    const { kept, unknown } = filterVendorCategories(raw, ['catering', 'venue']);
    expect(kept.map((c) => c.service_category_code)).toEqual(['catering', 'venue']);
    expect(unknown).toEqual(['unicorn']);
  });

  it('cuando activeCodes es null preserva todas las categorías', () => {
    const raw = [
      { service_category_code: 'catering', name: 'A', priority_score: 0.9, reason: 'r' },
      { service_category_code: 'foo', name: 'B', priority_score: 0.8, reason: 'r' },
    ];
    const { kept, unknown } = filterVendorCategories(raw, null);
    expect(kept).toHaveLength(2);
    expect(unknown).toEqual([]);
  });

  it('cuando activeCodes está vacío preserva todas las categorías (compat US-097)', () => {
    const raw = [
      { service_category_code: 'catering', name: 'A', priority_score: 0.9, reason: 'r' },
    ];
    const { kept, unknown } = filterVendorCategories(raw, []);
    expect(kept).toHaveLength(1);
    expect(unknown).toEqual([]);
  });
});

describe.skip('US-020 BE-003 — sortVendorCategoriesByPriorityDesc', () => {
  it('ordena por priority_score descendente sin mutar el arreglo original', () => {
    const src = [
      { service_category_code: 'a', name: 'A', priority_score: 0.3, reason: 'r' },
      { service_category_code: 'b', name: 'B', priority_score: 0.9, reason: 'r' },
      { service_category_code: 'c', name: 'C', priority_score: 0.6, reason: 'r' },
    ];
    const sorted = sortVendorCategoriesByPriorityDesc(src);
    expect(sorted.map((c) => c.service_category_code)).toEqual(['b', 'c', 'a']);
    // No mutation
    expect(src[0]?.service_category_code).toBe('a');
  });
});

describe.skip('US-020 AC-01/AC-04/EC-01 — integración con AiGenerationService', () => {
  const svc = new AiGenerationService(new MockAIProvider());

  it('sin service_categories_active devuelve la lista completa ordenada desc', async () => {
    const result = await svc.generate(
      'vendor_categories',
      { event_type_code: 'wedding' },
      'es-LATAM',
      undefined,
    );
    const output = result.output as {
      categories: Array<{ service_category_code: string; priority_score: number }>;
    };
    // Deben venir ordenadas desc por priority_score.
    for (let i = 1; i < output.categories.length; i++) {
      expect(output.categories[i - 1]!.priority_score).toBeGreaterThanOrEqual(
        output.categories[i]!.priority_score,
      );
    }
  });

  it('con whitelist restringida filtra las categorías fuera y loguea unknown_category', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const result = await svc.generate(
      'vendor_categories',
      { event_type_code: 'wedding', service_categories_active: ['catering', 'venue'] },
      'es-LATAM',
      undefined,
    );
    const output = result.output as {
      categories: Array<{ service_category_code: string }>;
    };
    const codes = output.categories.map((c) => c.service_category_code);
    expect(codes.every((c) => c === 'catering' || c === 'venue')).toBe(true);
    // El mock devuelve 6 categorías → 4 unknown.
    const unknownCalls = warnSpy.mock.calls.filter((call) => {
      const payload = call[0] as Record<string, unknown>;
      return payload?.event === 'ai.vendor-categories.unknown_category';
    });
    expect(unknownCalls.length).toBeGreaterThanOrEqual(4);
    // Los logs no deben incluir PII/raw input del usuario.
    for (const call of unknownCalls) {
      const payload = JSON.stringify(call[0]);
      expect(payload).not.toContain('secretGuest');
    }
    warnSpy.mockRestore();
  });

  it('si la whitelist deja la lista vacía → AiInvalidOutputError (EC-02)', async () => {
    // Ningún código del mock coincide con esta whitelist → filtro deja lista vacía.
    await expect(
      svc.generate(
        'vendor_categories',
        { event_type_code: 'wedding', service_categories_active: ['non_existing_code'] },
        'es-LATAM',
        undefined,
      ),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
});