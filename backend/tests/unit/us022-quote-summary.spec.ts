// US-022 (PB-P2-001 / QA-001) — Unit tests del resumen IA del comparador de Quotes.
// Cubre:
//   - DTO `QuoteSummaryBodySchema` (VR-01, EC-02).
//   - Output schema `OUTPUT_SCHEMAS.quote_compare_summary` (AC-02, EC-03).
//   - `GenerateQuoteSummaryUseCase` branches (AC-01..05, EC-01..02).
//   - Prompt registry: activo en 4 locales (AC-04).
//   - Response mapper (contrato tech spec §7).
import { describe, it, expect, vi } from 'vitest';
import { QuoteSummaryBodySchema } from '../../src/modules/ai-assistance/dto/quote-summary.request.js';
import { toQuoteSummaryResponse } from '../../src/modules/ai-assistance/dto/quote-summary.response.js';
import { OUTPUT_SCHEMAS } from '../../src/modules/ai-assistance/domain/ai-features.js';
import { GenerateQuoteSummaryUseCase } from '../../src/modules/ai-assistance/application/generate-quote-summary.us022.use-case.js';
import { Us022InsufficientQuotesError } from '../../src/modules/ai-assistance/domain/us022.errors.js';
import { Us022InvalidCategoryError } from '../../src/modules/ai-assistance/domain/us022.errors.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { promptRegistry } from '../../src/modules/ai-assistance/infrastructure/prompt-registry/index.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

// ─── DTO ──────────────────────────────────────────────────────────────────────

describe('US-022 QA-001 — QuoteSummaryBodySchema (VR-01)', () => {
  it('acepta `category_code` string 1..64', () => {
    expect(QuoteSummaryBodySchema.parse({ category_code: 'catering' }).category_code).toBe(
      'catering',
    );
  });

  it('rechaza objeto vacío (falta `category_code`)', () => {
    expect(() => QuoteSummaryBodySchema.parse({})).toThrow();
  });

  it('rechaza `category_code` vacío', () => {
    expect(() => QuoteSummaryBodySchema.parse({ category_code: '' })).toThrow();
  });

  it('rechaza `category_code` > 64', () => {
    expect(() => QuoteSummaryBodySchema.parse({ category_code: 'x'.repeat(65) })).toThrow();
  });

  it('rechaza campos extra (strict)', () => {
    expect(() =>
      QuoteSummaryBodySchema.parse({ category_code: 'catering', otro: 'x' }),
    ).toThrow();
  });

  it('acepta `preferMock=true`', () => {
    expect(
      QuoteSummaryBodySchema.parse({ category_code: 'catering', preferMock: true }).preferMock,
    ).toBe(true);
  });
});

// ─── Output schema ────────────────────────────────────────────────────────────

describe('US-022 QA-001 — quote_compare_summary output schema (AC-02, EC-03)', () => {
  const schema = OUTPUT_SCHEMAS.quote_compare_summary;

  it('acepta salida válida con summaries no vacío', () => {
    const ok = schema.safeParse({
      summaries: [
        {
          quote_id: '11111111-1111-4111-8111-111111111111',
          pros: ['bueno'],
          cons: [],
          missing_info: [],
          notes: '',
        },
      ],
      overall_observations: 'ok',
    });
    expect(ok.success).toBe(true);
  });

  it('rechaza summaries vacío (min 1)', () => {
    const bad = schema.safeParse({ summaries: [] });
    expect(bad.success).toBe(false);
  });

  it('rechaza campo desconocido (strict)', () => {
    const bad = schema.safeParse({
      summaries: [
        {
          quote_id: '11111111-1111-4111-8111-111111111111',
          pros: [],
          cons: [],
          missing_info: [],
          notes: '',
          recommendation: 'gana el primero',
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it('rechaza pros > 5', () => {
    const bad = schema.safeParse({
      summaries: [
        {
          quote_id: '11111111-1111-4111-8111-111111111111',
          pros: ['a', 'b', 'c', 'd', 'e', 'f'],
          cons: [],
          missing_info: [],
          notes: '',
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it('rechaza notes > 500', () => {
    const bad = schema.safeParse({
      summaries: [
        {
          quote_id: '11111111-1111-4111-8111-111111111111',
          pros: [],
          cons: [],
          missing_info: [],
          notes: 'x'.repeat(501),
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it('rechaza `quote_id` no UUID', () => {
    const bad = schema.safeParse({
      summaries: [
        { quote_id: 'not-a-uuid', pros: [], cons: [], missing_info: [], notes: '' },
      ],
    });
    expect(bad.success).toBe(false);
  });
});

// ─── Use case branches ────────────────────────────────────────────────────────

function makeMocks(overrides?: {
  ownerId?: string;
  currency?: string;
  category?: { id: string; code: string; label: string } | null;
  quotes?: Array<{ quoteId: string; status: string; totalPrice: string }>;
}) {
  const ownerId = overrides?.ownerId ?? 'org-1';
  const events = {
    async findOwnedEvent(eventId: string, userId: string) {
      return userId === ownerId
        ? { id: eventId, currency: overrides?.currency ?? 'GTQ', status: 'active' }
        : null;
    },
    async getOwnerId(): Promise<string | null> { return ownerId; },
    async getCurrency(): Promise<string | null> { return overrides?.currency ?? 'GTQ'; },
  } as unknown as ConstructorParameters<typeof GenerateQuoteSummaryUseCase>[0];
  const categoryProvided = overrides && 'category' in overrides;
  const categories = {
    async findActiveByCode(code: string) {
      if (categoryProvided) return overrides?.category ?? null;
      return { id: 'cat-1', code, label: 'Catering' };
    },
    async existsActive(): Promise<boolean> { return true; },
  } as unknown as ConstructorParameters<typeof GenerateQuoteSummaryUseCase>[1];
  const quotesList = overrides?.quotes ?? [
    { quoteId: 'q1', status: 'sent', totalPrice: '100.00' },
    { quoteId: 'q2', status: 'sent', totalPrice: '150.00' },
  ];
  const quotes = {
    async findComparableByEventAndCategory() {
      return quotesList.map((q) => ({
        quoteId: q.quoteId,
        vendor: { profileId: 'vp', businessName: 'V', slug: null, ratingAvg: null, reviewsCount: 0 },
        status: q.status,
        totalPrice: q.totalPrice,
        breakdown: null,
        validUntil: null,
        conditions: null,
        isPreferred: false,
        createdAt: '2026-07-22T00:00:00Z',
      }));
    },
  } as unknown as ConstructorParameters<typeof GenerateQuoteSummaryUseCase>[2];
  const generate = {
    execute: vi.fn(async () => ({
      id: 'ai-1',
      type: 'quote_compare_summary',
      status: 'pending',
      requestedByUserId: ownerId,
      eventId: 'ev-1',
      vendorProfileId: null,
      quoteRequestId: null,
      input: {},
      output: {},
      aiMeta: {},
      locale: 'es-LATAM',
      localeFallback: false,
      createdAt: '2026-07-22T00:00:00Z',
    })),
  } as unknown as ConstructorParameters<typeof GenerateQuoteSummaryUseCase>[3];
  const uc = new GenerateQuoteSummaryUseCase(events, categories, quotes, generate);
  return { uc, events, categories, quotes, generate };
}

describe('US-022 QA-001 — GenerateQuoteSummaryUseCase (AC-01..05, EC-01..02)', () => {
  it('AC-01 · flujo feliz: delega al motor genérico con feature=quote_compare_summary y snapshot en input', async () => {
    const { uc, generate } = makeMocks();
    await uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' });
    const mockCalls = (generate as unknown as { execute: { mock: { calls: unknown[][] } } })
      .execute.mock.calls;
    const firstCall = mockCalls[0];
    if (!firstCall) throw new Error('execute was not called');
    const call = firstCall[0] as {
      feature: string;
      contextId: string;
      input: Record<string, unknown>;
    };
    expect(call.feature).toBe('quote_compare_summary');
    expect(call.contextId).toBe('ev-1');
    expect(call.input.quote_ids_snapshot).toEqual(['q1', 'q2']);
    expect(call.input.category_code).toBe('catering');
    expect(call.input.prompt_version).toBe('v1');
    expect(call.input.__quote_ids).toEqual(['q1', 'q2']);
    expect(Array.isArray(call.input.quotes)).toBe(true);
  });

  it('EC-03 · organizer ajeno → NotFoundError (404 uniforme mediante `requireEventOwner`)', async () => {
    const { uc } = makeMocks({ ownerId: 'other' });
    await expect(
      uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('EC-02 · categoría inexistente → 400 INVALID_CATEGORY', async () => {
    // makeMocks distingue null via un flag para evitar el `??` fallback.
    const { uc } = makeMocks({ category: null as unknown as { id: string; code: string; label: string } });
    await expect(
      uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'unknown' }),
    ).rejects.toBeInstanceOf(Us022InvalidCategoryError);
  });

  it('EC-01 · < 2 quotes activas → 400 INSUFFICIENT_QUOTES con eligible_count', async () => {
    const { uc } = makeMocks({
      quotes: [{ quoteId: 'q1', status: 'sent', totalPrice: '100.00' }],
    });
    try {
      await uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Us022InsufficientQuotesError);
      expect((err as Us022InsufficientQuotesError).eligibleCount).toBe(1);
    }
  });

  it('EC-01 · quotes en estado rechazado/expirado no cuentan', async () => {
    const { uc } = makeMocks({
      quotes: [
        { quoteId: 'q1', status: 'rejected', totalPrice: '100.00' },
        { quoteId: 'q2', status: 'expired', totalPrice: '150.00' },
        { quoteId: 'q3', status: 'sent', totalPrice: '200.00' },
      ],
    });
    await expect(
      uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' }),
    ).rejects.toBeInstanceOf(Us022InsufficientQuotesError);
  });
});

// ─── Prompt registry (AC-04) ──────────────────────────────────────────────────

describe('US-022 QA-001 — prompt registry (AC-04 locale binding)', () => {
  it('resuelve prompt activo en 4 locales', () => {
    for (const locale of ['es-LATAM', 'es-ES', 'pt', 'en'] as const) {
      const t = promptRegistry.resolveActive('quote_compare_summary', locale);
      expect(t.status).toBe('active');
      expect(t.featureType).toBe('quote_compare_summary');
      expect(t.languageSupport).toEqual([locale]);
      expect(t.templateHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    }
  });
});

// ─── Response mapper ──────────────────────────────────────────────────────────

describe('US-022 QA-001 — toQuoteSummaryResponse (contrato §7)', () => {
  it('mapea todos los campos del contrato', () => {
    const view: AiRecommendationView = {
      id: 'ai-1',
      type: 'quote_compare_summary',
      status: 'pending',
      requestedByUserId: 'org-1',
      eventId: 'ev-1',
      vendorProfileId: null,
      quoteRequestId: null,
      input: { quote_ids_snapshot: ['q1', 'q2'], category_code: 'catering' },
      output: {
        summaries: [
          {
            quote_id: '11111111-1111-4111-8111-111111111111',
            pros: [],
            cons: [],
            missing_info: [],
            notes: '',
          },
        ],
        overall_observations: 'ok',
      },
      aiMeta: {} as unknown as AiRecommendationView['aiMeta'],
      locale: 'pt',
      localeFallback: true,
      createdAt: '2026-07-22T00:00:00Z',
    };
    const dto = toQuoteSummaryResponse(view);
    expect(dto).toMatchObject({
      ai_recommendation_id: 'ai-1',
      locale: 'pt',
      locale_fallback: true,
      generated_at: '2026-07-22T00:00:00Z',
      quote_ids_snapshot: ['q1', 'q2'],
      category_code: 'catering',
    });
    expect(dto.summaries).toHaveLength(1);
    expect(dto.overall_observations).toBe('ok');
  });
});
