// US-057 (PB-P1-035 / QA-001) — Unit tests.
// Cobertura:
//   - DTO `CompareQuotesQuerySchema`: categoryCode ausente/vacío/válido, `.strict()`.
//   - DTO `CompareQuotesEventIdParamSchema`: UUID válido/inválido.
//   - `toComparableQuoteItem` mapper: shape whitelisted (no PII), preserva tipos.
//   - `CompareQuotesUseCase`: happy path (≥2 quotes), 1 quote, 0 quotes (empty), EC-01
//     categoryCode ausente, EC-02 categoría inexistente/inactiva, EC-03 evento ajeno/inexistente,
//     EC-04 mezcla de estados, orden estable (is_preferred DESC, activos primero, total_price ASC),
//     logger emit con metadatos seguros.
import { describe, expect, it, vi } from 'vitest';
import {
  CompareQuotesQuerySchema,
  CompareQuotesEventIdParamSchema,
} from '../../src/modules/quote-flow/dto/compare-quotes.us057.query.js';
import { toComparableQuoteItem } from '../../src/modules/quote-flow/application/compare-quotes.us057.mapper.js';
import { CompareQuotesUseCase } from '../../src/modules/quote-flow/application/compare-quotes.us057.use-case.js';
import {
  CompareQuotesCategoryRequiredError,
  CompareQuotesInvalidCategoryError,
} from '../../src/modules/quote-flow/domain/us057.errors.js';
import { EventNotFoundError } from '../../src/modules/quote-flow/domain/us049.errors.js';
import type { ComparableQuoteRow, QuoteRepository } from '../../src/modules/quote-flow/ports/quote-flow.repositories.js';
import type {
  EventAccessReader,
  ServiceCategoryReader,
} from '../../src/shared/access/readers.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';

const ORGANIZER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SC_ID = '99999999-9999-9999-9999-999999999999';
const SC_CODE = 'catering';

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('US-057 · CompareQuotesQuerySchema', () => {
  it('acepta query con `categoryCode` válido', () => {
    const parsed = CompareQuotesQuerySchema.safeParse({ categoryCode: 'catering' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.categoryCode).toBe('catering');
  });

  it('acepta query vacío (`categoryCode` opcional en la schema — EC-01 se detecta en el UC)', () => {
    const parsed = CompareQuotesQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.categoryCode).toBeUndefined();
  });

  it('rechaza `categoryCode` vacío string', () => {
    const parsed = CompareQuotesQuerySchema.safeParse({ categoryCode: '' });
    expect(parsed.success).toBe(false);
  });

  it('rechaza `categoryCode` > 64 chars', () => {
    const parsed = CompareQuotesQuerySchema.safeParse({ categoryCode: 'a'.repeat(65) });
    expect(parsed.success).toBe(false);
  });

  it('rechaza keys ajenas (.strict())', () => {
    const parsed = CompareQuotesQuerySchema.safeParse({ categoryCode: 'ok', extra: 'nope' });
    expect(parsed.success).toBe(false);
  });
});

describe('US-057 · CompareQuotesEventIdParamSchema', () => {
  it('acepta UUID válido', () => {
    const parsed = CompareQuotesEventIdParamSchema.safeParse({ id: EVENT_ID });
    expect(parsed.success).toBe(true);
  });

  it('rechaza id no-UUID', () => {
    const parsed = CompareQuotesEventIdParamSchema.safeParse({ id: 'not-a-uuid' });
    expect(parsed.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────
describe('US-057 · toComparableQuoteItem', () => {
  const row: ComparableQuoteRow = {
    quoteId: 'q1111111-1111-1111-1111-111111111111',
    vendor: {
      profileId: 'v1111111-1111-1111-1111-111111111111',
      businessName: 'Catering Aurora',
      slug: 'catering-aurora',
      ratingAvg: 4.6,
      reviewsCount: 24,
    },
    status: 'sent',
    totalPrice: '5000.00',
    breakdown: [{ label: 'Menú', amount: '5000.00' }],
    validUntil: '2026-08-01T00:00:00.000Z',
    conditions: 'Requiere anticipo.',
    isPreferred: false,
    createdAt: '2026-07-01T12:00:00.000Z',
  };

  it('produce el shape whitelisted del contrato', () => {
    const item = toComparableQuoteItem(row);
    expect(item).toEqual({
      quote_id: row.quoteId,
      vendor: {
        profile_id: row.vendor.profileId,
        business_name: row.vendor.businessName,
        slug: row.vendor.slug,
        rating_avg: row.vendor.ratingAvg,
        reviews_count: row.vendor.reviewsCount,
      },
      status: row.status,
      total_price: row.totalPrice,
      breakdown: row.breakdown,
      valid_until: row.validUntil,
      conditions: row.conditions,
      is_preferred: row.isPreferred,
      created_at: row.createdAt,
    });
  });

  it('preserva `null` en campos opcionales del vendor y de la Quote', () => {
    const item = toComparableQuoteItem({
      ...row,
      vendor: { ...row.vendor, slug: null, ratingAvg: null },
      breakdown: null,
      validUntil: null,
      conditions: null,
    });
    expect(item.vendor.slug).toBeNull();
    expect(item.vendor.rating_avg).toBeNull();
    expect(item.breakdown).toBeNull();
    expect(item.valid_until).toBeNull();
    expect(item.conditions).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Use Case
// ─────────────────────────────────────────────────────────────────────────────

interface Deps {
  quotes: QuoteRepository;
  events: EventAccessReader;
  categories: ServiceCategoryReader;
  logger: DomainEventLogger;
}

function makeDeps(overrides?: {
  eventOwned?: boolean;
  categoryActive?: boolean;
  rows?: ComparableQuoteRow[];
  findComparableImpl?: (input: {
    eventId: string;
    serviceCategoryId: string;
  }) => Promise<ComparableQuoteRow[]>;
}): Deps & {
  emit: ReturnType<typeof vi.fn>;
  findComparable: ReturnType<typeof vi.fn>;
} {
  const eventOwned = overrides?.eventOwned ?? true;
  const categoryActive = overrides?.categoryActive ?? true;
  const rows = overrides?.rows ?? [];
  const findComparable =
    overrides?.findComparableImpl !== undefined
      ? vi.fn(overrides.findComparableImpl)
      : vi.fn(async () => rows);
  const emit = vi.fn();

  const quotes: QuoteRepository = {
    createDraft: vi.fn(),
    findById: vi.fn(),
    findCurrentByQuoteRequest: vi.fn(),
    update: vi.fn(),
    send: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
    findComparableByEventAndCategory: findComparable,
  };

  const events: EventAccessReader = {
    getOwnerId: vi.fn(async () => (eventOwned ? ORGANIZER_ID : null)),
    getCurrency: vi.fn(),
    findOwnedEvent: vi.fn(async () =>
      eventOwned ? { id: EVENT_ID, currency: 'GTQ' as const, status: 'active' as const } : null,
    ),
  };

  const categories: ServiceCategoryReader = {
    existsActive: vi.fn(),
    findActiveByCode: vi.fn(async () =>
      categoryActive ? { id: SC_ID, code: SC_CODE, label: 'Catering' } : null,
    ),
  };

  const logger: DomainEventLogger = { emit };

  return { quotes, events, categories, logger, emit, findComparable };
}

function makeRow(overrides: Partial<ComparableQuoteRow> & { quoteId: string }): ComparableQuoteRow {
  const base: ComparableQuoteRow = {
    quoteId: overrides.quoteId,
    vendor: {
      profileId: `${overrides.quoteId}-v`,
      businessName: `Vendor ${overrides.quoteId}`,
      slug: null,
      ratingAvg: null,
      reviewsCount: 0,
    },
    status: 'sent',
    totalPrice: '1000.00',
    breakdown: null,
    validUntil: null,
    conditions: null,
    isPreferred: false,
    createdAt: '2026-07-01T12:00:00.000Z',
  };
  return { ...base, ...overrides };
}

describe('US-057 · CompareQuotesUseCase.execute', () => {
  it('AC-03: 0 quotes → response `{ items: [] }` con category + currency', async () => {
    const deps = makeDeps({ rows: [] });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    const res = await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    expect(res.items).toEqual([]);
    expect(res.category).toEqual({ code: SC_CODE, name: 'Catering' });
    expect(res.currency_code).toBe('GTQ');
  });

  it('AC-02: 1 quote → response con items.length=1', async () => {
    const deps = makeDeps({ rows: [makeRow({ quoteId: 'q1111111-1111-1111-1111-111111111111' })] });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    const res = await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    expect(res.items).toHaveLength(1);
  });

  it('AC-01: ≥2 quotes → items preservan el orden del repositorio', async () => {
    const rows = [
      makeRow({ quoteId: 'q2222222-2222-2222-2222-222222222222', isPreferred: true, totalPrice: '4500.00' }),
      makeRow({ quoteId: 'q1111111-1111-1111-1111-111111111111', totalPrice: '5000.00' }),
      makeRow({ quoteId: 'q3333333-3333-3333-3333-333333333333', status: 'expired', totalPrice: '3500.00' }),
    ];
    const deps = makeDeps({ rows });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    const res = await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    expect(res.items.map((i) => i.quote_id)).toEqual([
      'q2222222-2222-2222-2222-222222222222',
      'q1111111-1111-1111-1111-111111111111',
      'q3333333-3333-3333-3333-333333333333',
    ]);
  });

  it('EC-01: `categoryCode` undefined → CompareQuotesCategoryRequiredError', async () => {
    const deps = makeDeps();
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await expect(uc.execute(ORGANIZER_ID, EVENT_ID, {})).rejects.toBeInstanceOf(
      CompareQuotesCategoryRequiredError,
    );
    expect(deps.events.findOwnedEvent).not.toHaveBeenCalled();
    expect(deps.findComparable).not.toHaveBeenCalled();
  });

  it('EC-01: `categoryCode` vacío string → CompareQuotesCategoryRequiredError', async () => {
    const deps = makeDeps();
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await expect(
      uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: '' }),
    ).rejects.toBeInstanceOf(CompareQuotesCategoryRequiredError);
  });

  it('EC-03: evento inexistente/ajeno → EventNotFoundError uniforme', async () => {
    const deps = makeDeps({ eventOwned: false });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await expect(
      uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE }),
    ).rejects.toBeInstanceOf(EventNotFoundError);
    expect(deps.categories.findActiveByCode).not.toHaveBeenCalled();
    expect(deps.findComparable).not.toHaveBeenCalled();
  });

  it('EC-02: categoryCode inexistente o inactivo → CompareQuotesInvalidCategoryError', async () => {
    const deps = makeDeps({ categoryActive: false });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await expect(
      uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: 'ghost' }),
    ).rejects.toBeInstanceOf(CompareQuotesInvalidCategoryError);
    expect(deps.findComparable).not.toHaveBeenCalled();
  });

  it('EC-04: quotes con estados `expired` y `rejected` aparecen en items con el status correspondiente', async () => {
    const rows = [
      makeRow({ quoteId: 'q1111111-1111-1111-1111-111111111111', status: 'sent' }),
      makeRow({ quoteId: 'q2222222-2222-2222-2222-222222222222', status: 'expired' }),
      makeRow({ quoteId: 'q3333333-3333-3333-3333-333333333333', status: 'rejected' }),
    ];
    const deps = makeDeps({ rows });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    const res = await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    const statuses = res.items.map((i) => i.status);
    expect(statuses).toContain('sent');
    expect(statuses).toContain('expired');
    expect(statuses).toContain('rejected');
  });

  it('emite `quote_compare.requested` con metadatos seguros (correlationId, actorId, eventId, serviceCategoryId, count)', async () => {
    const rows = [makeRow({ quoteId: 'q1111111-1111-1111-1111-111111111111' })];
    const deps = makeDeps({ rows });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE }, { correlationId: 'corr-1' });
    expect(deps.emit).toHaveBeenCalledWith('quote_compare.requested', {
      correlationId: 'corr-1',
      actorId: ORGANIZER_ID,
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
      count: 1,
    });
  });

  it('el repositorio recibe el `serviceCategoryId` resuelto por `findActiveByCode` (no el slug)', async () => {
    const deps = makeDeps();
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    expect(deps.findComparable).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      serviceCategoryId: SC_ID,
    });
  });

  it('respuesta preserva `currency_code` del evento (heredada — BR-QUOTE-019)', async () => {
    const deps = makeDeps({ rows: [] });
    const uc = new CompareQuotesUseCase(deps.quotes, deps.events, deps.categories, deps.logger);
    const res = await uc.execute(ORGANIZER_ID, EVENT_ID, { categoryCode: SC_CODE });
    expect(res.currency_code).toBe('GTQ');
  });
});
