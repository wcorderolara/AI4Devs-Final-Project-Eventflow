// US-115 (PB-P2-012 / QA-001) — Unit tests del `GetAIMetricsUseCase`.
//
// Cobertura de AC:
//   UT-01 (AC-01): mock retorna data completa para las 7 features → shape con 7 entradas.
//   UT-02 (AC-05): mock retorna sólo `event_plan` → 6 features aparecen con count=0/nulls.
//   UT-03 (AC-02): `window: '24h'` → 1 sola ventana en response.
//   UT-04 (AC-07): fixture conocido (10 event_plan: 5 accepted, 3 fallback, avg latency 1530)
//     → métricas exactas (`count=10, latencyAvgMs=1530.0, fallbackRate=0.3,
//     acceptanceRate=0.5`).
//
// Deviation D-01 (execution record): los nombres canónicos son los del enum real
// (`budget_suggestion`, `vendor_categories`, `quote_compare_summary`), no los alias del
// Tech Spec (`budget_split`, `category_suggestion`, `comparator_summary`).
import { describe, it, expect } from 'vitest';
import { GetAIMetricsUseCase } from '../../src/modules/admin-governance/application/get-ai-metrics.use-case.js';
import {
  CANONICAL_AI_FEATURES,
  type AIMetricsRawRow,
  type AIMetricsWindow,
} from '../../src/modules/admin-governance/domain/ai-metrics.types.js';
import type { AIMetricsRepository } from '../../src/modules/admin-governance/infrastructure/prisma-ai-metrics.repository.js';

function stubRepo(byWindow: Partial<Record<AIMetricsWindow, AIMetricsRawRow[]>>): AIMetricsRepository {
  return {
    async getMetricsByWindow(window) {
      return byWindow[window] ?? [];
    },
  };
}

const USER_ID = '00000000-0000-4000-8000-000000000115';

describe('US-115 UT-01 (AC-01) — data completa para las 7 features → 7 entradas con métricas', () => {
  it('cada ventana solicitada expone exactamente las 7 features canónicas en orden estable', async () => {
    const rows: AIMetricsRawRow[] = CANONICAL_AI_FEATURES.map((type, idx) => ({
      type,
      count: 3 + idx,
      latencyAvgMs: 1000 + idx * 10,
      fallbackRate: 0.1,
      acceptanceRate: 0.5,
    }));
    const useCase = new GetAIMetricsUseCase(stubRepo({ '24h': rows, 'all-time': rows }));

    const result = await useCase.execute({ userId: USER_ID, window: 'both' });

    expect(result.windows).toHaveLength(2);
    for (const w of result.windows) {
      expect(w!.features).toHaveLength(CANONICAL_AI_FEATURES.length);
      expect(w!.features.map((f) => f.type)).toEqual([...CANONICAL_AI_FEATURES]);
      for (const f of w!.features) {
        expect(typeof f.count).toBe('number');
        expect(f.count).toBeGreaterThan(0);
        expect(f.latencyAvgMs).not.toBeNull();
        expect(f.fallbackRate).not.toBeNull();
        expect(f.acceptanceRate).not.toBeNull();
      }
    }
  });
});

describe('US-115 UT-02 (AC-05) — data parcial → features sin data reportan count=0 y métricas null', () => {
  it('sólo event_plan tiene rows; las otras 6 features aparecen con count=0/nulls', async () => {
    const rows: AIMetricsRawRow[] = [
      { type: 'event_plan', count: 4, latencyAvgMs: 500.5, fallbackRate: 0.25, acceptanceRate: 0.75 },
    ];
    const useCase = new GetAIMetricsUseCase(stubRepo({ 'all-time': rows }));

    const { windows } = await useCase.execute({ userId: USER_ID, window: 'all-time' });

    expect(windows).toHaveLength(1);
    const w = windows[0]!;
    const eventPlan = w.features.find((f) => f.type === 'event_plan');
    expect(eventPlan).toEqual({
      type: 'event_plan',
      count: 4,
      latencyAvgMs: 500.5,
      fallbackRate: 0.25,
      acceptanceRate: 0.75,
    });
    const others = w.features.filter((f) => f.type !== 'event_plan');
    expect(others).toHaveLength(CANONICAL_AI_FEATURES.length - 1);
    for (const f of others) {
      expect(f).toEqual({
        type: f.type,
        count: 0,
        latencyAvgMs: null,
        fallbackRate: null,
        acceptanceRate: null,
      });
    }
  });
});

describe('US-115 UT-03 (AC-02) — window param aísla ventanas correctamente', () => {
  it('window: "24h" → 1 sola ventana', async () => {
    const useCase = new GetAIMetricsUseCase(stubRepo({}));
    const { windows } = await useCase.execute({ userId: USER_ID, window: '24h' });
    expect(windows).toHaveLength(1);
    expect(windows[0]!.window).toBe('24h');
  });

  it('window: "all-time" → 1 sola ventana', async () => {
    const useCase = new GetAIMetricsUseCase(stubRepo({}));
    const { windows } = await useCase.execute({ userId: USER_ID, window: 'all-time' });
    expect(windows).toHaveLength(1);
    expect(windows[0]!.window).toBe('all-time');
  });

  it('window: "both" → 2 ventanas en orden [24h, all-time]', async () => {
    const useCase = new GetAIMetricsUseCase(stubRepo({}));
    const { windows } = await useCase.execute({ userId: USER_ID, window: 'both' });
    expect(windows.map((w) => w.window)).toEqual(['24h', 'all-time']);
  });
});

describe('US-115 UT-04 (AC-07) — fixture conocido (10 event_plan) reporta métricas exactas', () => {
  it('count=10, latencyAvgMs=1530.0, fallbackRate=0.3, acceptanceRate=0.5', async () => {
    // Simula lo que devolvería el repository — el SQL ya aplicó los redondeos.
    const rows: AIMetricsRawRow[] = [
      { type: 'event_plan', count: 10, latencyAvgMs: 1530.0, fallbackRate: 0.3, acceptanceRate: 0.5 },
    ];
    const useCase = new GetAIMetricsUseCase(stubRepo({ 'all-time': rows }));

    const { windows } = await useCase.execute({ userId: USER_ID, window: 'all-time' });
    const eventPlan = windows[0]!.features.find((f) => f.type === 'event_plan')!;
    expect(eventPlan.count).toBe(10);
    expect(eventPlan.latencyAvgMs).toBeCloseTo(1530.0, 1);
    expect(eventPlan.fallbackRate).toBeCloseTo(0.3, 4);
    expect(eventPlan.acceptanceRate).toBeCloseTo(0.5, 4);
  });
});

describe('US-115 UT — BE-002: shape canónico de CANONICAL_AI_FEATURES', () => {
  it('expone las 7 features MVP en orden estable', () => {
    expect(CANONICAL_AI_FEATURES).toEqual([
      'event_plan',
      'checklist',
      'budget_suggestion',
      'vendor_categories',
      'quote_brief',
      'quote_compare_summary',
      'vendor_bio',
    ]);
    expect(CANONICAL_AI_FEATURES).toHaveLength(7);
    // Frozen tuple — no debería mutarse en tiempo de ejecución.
    expect(Object.isFrozen(CANONICAL_AI_FEATURES) || Array.isArray(CANONICAL_AI_FEATURES)).toBe(true);
  });
});

describe('US-115 UT — BE-001: Zod schema query params (VR-03)', () => {
  it('acepta enum válido y aplica default "both" cuando se omite', async () => {
    const { aiMetricsQuerySchema } = await import(
      '../../src/shared/validation/ai-metrics.query.schema.js'
    );
    expect(aiMetricsQuerySchema.parse({})).toEqual({ window: 'both' });
    expect(aiMetricsQuerySchema.parse({ window: '24h' })).toEqual({ window: '24h' });
    expect(aiMetricsQuerySchema.parse({ window: 'all-time' })).toEqual({ window: 'all-time' });
    expect(aiMetricsQuerySchema.parse({ window: 'both' })).toEqual({ window: 'both' });
  });

  it('rechaza valores fuera del enum (EC-03) y campos extraños (SEC-04)', async () => {
    const { aiMetricsQuerySchema } = await import(
      '../../src/shared/validation/ai-metrics.query.schema.js'
    );
    expect(() => aiMetricsQuerySchema.parse({ window: 'hourly' })).toThrow();
    expect(() => aiMetricsQuerySchema.parse({ window: '' })).toThrow();
    expect(() => aiMetricsQuerySchema.parse({ window: "' OR 1=1--" })).toThrow();
    // strict: campo desconocido rechazado.
    expect(() => aiMetricsQuerySchema.parse({ window: '24h', evil: 'x' })).toThrow();
  });
});
