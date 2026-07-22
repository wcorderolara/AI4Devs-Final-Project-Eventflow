// US-059 (PB-P2-001 / QA-001) — Unit tests del surface del último resumen IA.
// Cubre:
//   - DTO `LatestQuoteSummaryQuerySchema` (VR-03, EC-04).
//   - `GetLatestQuoteSummaryUseCase` branches (AC-01, AC-03, EC-01, EC-02).
import { describe, it, expect, vi } from 'vitest';
import { LatestQuoteSummaryQuerySchema } from '../../src/modules/ai-assistance/dto/latest-quote-summary.query.js';
import { GetLatestQuoteSummaryUseCase } from '../../src/modules/ai-assistance/application/get-latest-quote-summary.us059.use-case.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import type { AiRecommendationView } from '../../src/modules/ai-assistance/domain/ai-recommendation.js';

// ─── DTO ──────────────────────────────────────────────────────────────────────

describe('US-059 QA-001 — LatestQuoteSummaryQuerySchema (VR-03, EC-04)', () => {
  it('acepta `category_code` string 1..64', () => {
    const parsed = LatestQuoteSummaryQuerySchema.parse({ category_code: 'catering' });
    expect(parsed.category_code).toBe('catering');
  });

  it('rechaza objeto vacío (falta `category_code`)', () => {
    expect(() => LatestQuoteSummaryQuerySchema.parse({})).toThrow();
  });

  it('rechaza `category_code` vacío', () => {
    expect(() => LatestQuoteSummaryQuerySchema.parse({ category_code: '' })).toThrow();
  });

  it('rechaza `category_code` > 64 chars', () => {
    expect(() =>
      LatestQuoteSummaryQuerySchema.parse({ category_code: 'x'.repeat(65) }),
    ).toThrow();
  });

  it('rechaza campos extra (strict)', () => {
    expect(() =>
      LatestQuoteSummaryQuerySchema.parse({ category_code: 'catering', foo: 'bar' }),
    ).toThrow();
  });
});

// ─── Use case ─────────────────────────────────────────────────────────────────

function makeView(overrides?: Partial<AiRecommendationView>): AiRecommendationView {
  return {
    id: 'rec-1',
    type: 'quote_compare_summary',
    status: 'pending',
    requestedByUserId: 'org-1',
    eventId: 'ev-1',
    vendorProfileId: null,
    quoteRequestId: null,
    input: { category_code: 'catering', quote_ids_snapshot: ['q1', 'q2'] },
    output: { summaries: [] },
    aiMeta: null,
    locale: 'es-LATAM',
    localeFallback: false,
    createdAt: '2026-07-22T00:00:00Z',
    ...overrides,
  };
}

function makeUseCase(opts?: {
  ownerId?: string;
  latest?: AiRecommendationView | null;
}) {
  const ownerId = opts?.ownerId ?? 'org-1';
  const events = {
    async getOwnerId(): Promise<string | null> { return ownerId; },
    async getCurrency(): Promise<string | null> { return 'GTQ'; },
    async findOwnedEvent(eventId: string, userId: string) {
      return userId === ownerId ? { id: eventId, currency: 'GTQ', status: 'active' } : null;
    },
  } as unknown as ConstructorParameters<typeof GetLatestQuoteSummaryUseCase>[1];
  const findLatest = vi.fn(async () => opts?.latest ?? null);
  const repo = {
    findLatestByEventTypeAndCategory: findLatest,
  } as unknown as ConstructorParameters<typeof GetLatestQuoteSummaryUseCase>[0];
  const uc = new GetLatestQuoteSummaryUseCase(repo, events);
  return { uc, findLatest };
}

describe('US-059 QA-001 — GetLatestQuoteSummaryUseCase (AC-01, AC-03, EC-01)', () => {
  it('AC-01: retorna la vista cuando existe y el organizer es dueño', async () => {
    const view = makeView();
    const { uc, findLatest } = makeUseCase({ latest: view });
    const out = await uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' });
    expect(out).toBe(view);
    expect(findLatest).toHaveBeenCalledWith({
      eventId: 'ev-1',
      kind: 'quote_compare_summary',
      categoryCode: 'catering',
    });
  });

  it('EC-01 · ownership: organizer ajeno → NotFoundError (404 uniforme)', async () => {
    const { uc } = makeUseCase({ ownerId: 'other', latest: makeView() });
    await expect(
      uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('EC-02 · sin recomendación persistida → NotFoundError (empty state en FE)', async () => {
    const { uc } = makeUseCase({ latest: null });
    await expect(
      uc.execute({ userId: 'org-1', eventId: 'ev-1', categoryCode: 'catering' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
