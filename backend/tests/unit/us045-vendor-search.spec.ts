// US-045 (PB-P1-028 / QA-001) — Unit tests para:
//   - Cursor helper (encode/decode + rechazo de payload malformado).
//   - DTO `SearchVendorsQuerySchema` (refines cross-field + coerce + slug regex).
//   - Mapper `toVendorCardResponse` (priceRange y NULL semantics).
//   - `SearchVendorsUseCase` (branches: slugs inválidos, cursor inválido, vendor exclusion,
//     hasNext y cursor de la siguiente página).
import { describe, expect, it, vi } from 'vitest';
import {
  SearchVendorsQuerySchema,
  SEARCH_VENDORS_LIMIT_DEFAULT,
  SEARCH_VENDORS_LIMIT_MAX,
} from '../../src/modules/vendor-management/interface/dto/search-vendors.query.js';
import {
  decodeVendorSearchCursor,
  encodeVendorSearchCursor,
} from '../../src/modules/vendor-management/application/vendor-search-cursor.js';
import {
  toVendorCardResponse,
} from '../../src/modules/vendor-management/interface/dto/search-vendors.response.js';
import { SearchVendorsUseCase } from '../../src/modules/vendor-management/application/search-vendors.use-case.js';
import {
  InvalidCursorError,
  InvalidFiltersError,
} from '../../src/modules/vendor-management/application/vendor-search.errors.js';
import type {
  VendorSearchRepository,
  VendorSearchRow,
} from '../../src/modules/vendor-management/ports/vendor-search.repository.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cursor
// ─────────────────────────────────────────────────────────────────────────────
describe('vendor-search-cursor', () => {
  it('roundtrip: encode/decode preserva ratingAvg, createdAt e id', () => {
    const payload = {
      ratingAvg: 4.75,
      createdAt: new Date('2026-06-10T14:32:11.500Z'),
      id: '11111111-2222-3333-4444-555555555555',
    };
    const token = encodeVendorSearchCursor(payload);
    const decoded = decodeVendorSearchCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.ratingAvg).toBe(4.75);
    expect(decoded!.createdAt.toISOString()).toBe('2026-06-10T14:32:11.500Z');
    expect(decoded!.id).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('acepta ratingAvg NULL (vendor sin reviews)', () => {
    const token = encodeVendorSearchCursor({
      ratingAvg: null,
      createdAt: new Date('2026-06-10T00:00:00Z'),
      id: '11111111-2222-3333-4444-555555555555',
    });
    const decoded = decodeVendorSearchCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.ratingAvg).toBeNull();
  });

  it('rechaza base64 basura', () => {
    expect(decodeVendorSearchCursor('!!!not-base64!!!')).toBeNull();
  });

  it('rechaza JSON válido pero shape incorrecto', () => {
    const bad = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf-8').toString('base64url');
    expect(decodeVendorSearchCursor(bad)).toBeNull();
  });

  it('rechaza id que no es UUID (defensa contra inyección)', () => {
    const bad = Buffer.from(
      JSON.stringify({ r: 4.5, c: '2026-06-10T00:00:00Z', i: "1; DROP TABLE" }),
      'utf-8',
    ).toString('base64url');
    expect(decodeVendorSearchCursor(bad)).toBeNull();
  });

  it('rechaza rating fuera de rango [0..5]', () => {
    const bad = Buffer.from(
      JSON.stringify({ r: 99, c: '2026-06-10T00:00:00Z', i: '11111111-2222-3333-4444-555555555555' }),
      'utf-8',
    ).toString('base64url');
    expect(decodeVendorSearchCursor(bad)).toBeNull();
  });

  it('rechaza createdAt inválido', () => {
    const bad = Buffer.from(
      JSON.stringify({ r: 4.5, c: 'not-a-date', i: '11111111-2222-3333-4444-555555555555' }),
      'utf-8',
    ).toString('base64url');
    expect(decodeVendorSearchCursor(bad)).toBeNull();
  });

  it('rechaza cursor vacío', () => {
    expect(decodeVendorSearchCursor('')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DTO
// ─────────────────────────────────────────────────────────────────────────────
describe('SearchVendorsQuerySchema', () => {
  it('acepta query vacía y aplica limit default', () => {
    const parsed = SearchVendorsQuerySchema.parse({});
    expect(parsed.limit).toBe(SEARCH_VENDORS_LIMIT_DEFAULT);
    expect(parsed.currency).toBeUndefined();
  });

  it('acepta filtros completos válidos', () => {
    const parsed = SearchVendorsQuerySchema.parse({
      categoryCode: 'catering',
      locationCode: 'GT-GUA',
      priceMin: '100',
      priceMax: '500.50',
      currency: 'GTQ',
      limit: '10',
    });
    expect(parsed.limit).toBe(10);
    expect(parsed.currency).toBe('GTQ');
  });

  it('rechaza priceMin > priceMax', () => {
    const result = SearchVendorsQuerySchema.safeParse({
      priceMin: '500',
      priceMax: '100',
      currency: 'GTQ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'priceMin')).toBe(true);
    }
  });

  it('rechaza priceMin sin currency (currency_required_with_price)', () => {
    const result = SearchVendorsQuerySchema.safeParse({ priceMin: '100' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.join('.') === 'currency' && i.message === 'currency_required_with_price',
        ),
      ).toBe(true);
    }
  });

  it('rechaza limit > max', () => {
    const result = SearchVendorsQuerySchema.safeParse({ limit: String(SEARCH_VENDORS_LIMIT_MAX + 1) });
    expect(result.success).toBe(false);
  });

  it('rechaza slug con espacios', () => {
    const result = SearchVendorsQuerySchema.safeParse({ categoryCode: 'foo bar' });
    expect(result.success).toBe(false);
  });

  it('rechaza campos extra (strict)', () => {
    const result = SearchVendorsQuerySchema.safeParse({ foo: 'bar' });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────
describe('toVendorCardResponse', () => {
  const baseRow: VendorSearchRow = {
    id: '11111111-2222-3333-4444-555555555555',
    slug: 'quetzal',
    businessName: 'Banquetes El Quetzal',
    locationCode: 'GT-GUA',
    categoryCodes: ['catering'],
    ratingAvg: 4.6,
    reviewsCount: 12,
    priceMin: '150.00',
    priceMax: '450.00',
    priceCurrency: 'GTQ',
    createdAt: new Date('2026-06-01T00:00:00Z'),
  };

  it('mapea con priceRange cuando hay precio y currency', () => {
    const card = toVendorCardResponse(baseRow);
    expect(card.priceRange).toEqual({ min: '150.00', max: '450.00', currency: 'GTQ' });
    expect(card.thumbnailUrl).toBeNull();
    expect(card.ratingAvg).toBe(4.6);
  });

  it('deja priceRange en null cuando no hay currency', () => {
    const card = toVendorCardResponse({ ...baseRow, priceCurrency: null, priceMin: null, priceMax: null });
    expect(card.priceRange).toBeNull();
  });

  it('preserva ratingAvg null (vendor sin reviews)', () => {
    const card = toVendorCardResponse({ ...baseRow, ratingAvg: null, reviewsCount: 0 });
    expect(card.ratingAvg).toBeNull();
    expect(card.reviewsCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Use case
// ─────────────────────────────────────────────────────────────────────────────
function fakeRepo(rows: VendorSearchRow[]): VendorSearchRepository {
  return {
    searchApprovedVendors: vi.fn().mockResolvedValue(rows),
  };
}

const ORG_USER = { id: '00000000-0000-0000-0000-0000000000a1', role: 'organizer' as const };
const VENDOR_USER = { id: '00000000-0000-0000-0000-0000000000v1', role: 'vendor' as const };

function makeRow(overrides: Partial<VendorSearchRow>, i = 0): VendorSearchRow {
  return {
    id: `11111111-2222-3333-4444-55555555555${i}`,
    slug: `vendor-${i}`,
    businessName: `Vendor ${i}`,
    locationCode: 'GT-GUA',
    categoryCodes: ['catering'],
    ratingAvg: null,
    reviewsCount: 0,
    priceMin: null,
    priceMax: null,
    priceCurrency: null,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

describe('SearchVendorsUseCase', () => {
  it('lanza INVALID_FILTERS enumerando los slugs inválidos (categoryCode + locationCode)', async () => {
    const uc = new SearchVendorsUseCase(fakeRepo([]), {
      findActiveIdByCode: vi.fn().mockResolvedValue(null),
    }, {
      findIdByCode: vi.fn().mockResolvedValue(null),
    });
    await expect(
      uc.execute({
        currentUser: ORG_USER,
        query: { categoryCode: 'unknown', locationCode: 'unknown', limit: 20 },
      }),
    ).rejects.toBeInstanceOf(InvalidFiltersError);
    await expect(
      uc.execute({
        currentUser: ORG_USER,
        query: { categoryCode: 'unknown', locationCode: 'unknown', limit: 20 },
      }),
    ).rejects.toMatchObject({ invalid: ['categoryCode', 'locationCode'] });
  });

  it('lanza INVALID_CURSOR ante cursor corrupto', async () => {
    const uc = new SearchVendorsUseCase(fakeRepo([]), stubCategoryFound('cat-id'), stubLocationFound('loc-id'));
    await expect(
      uc.execute({ currentUser: ORG_USER, query: { cursor: 'not-a-cursor!!!', limit: 20 } }),
    ).rejects.toBeInstanceOf(InvalidCursorError);
  });

  it('excluye al vendor autenticado de sus propios resultados (SEC-03)', async () => {
    const repo = fakeRepo([]);
    const uc = new SearchVendorsUseCase(repo, stubCategoryFound(null), stubLocationFound(null));
    await uc.execute({ currentUser: VENDOR_USER, query: { limit: 20 } });
    expect(repo.searchApprovedVendors).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUserId: VENDOR_USER.id }),
    );
  });

  it('no excluye para organizer', async () => {
    const repo = fakeRepo([]);
    const uc = new SearchVendorsUseCase(repo, stubCategoryFound(null), stubLocationFound(null));
    await uc.execute({ currentUser: ORG_USER, query: { limit: 20 } });
    expect(repo.searchApprovedVendors).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUserId: null }),
    );
  });

  it('detecta hasNext=true cuando el repository devuelve limit+1 filas y arma cursor', async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      makeRow({
        id: `11111111-2222-3333-4444-55555555555${i}`,
        createdAt: new Date(`2026-06-0${i + 1}T00:00:00Z`),
      }, i),
    );
    const uc = new SearchVendorsUseCase(fakeRepo(rows), stubCategoryFound(null), stubLocationFound(null));
    const result = await uc.execute({ currentUser: ORG_USER, query: { limit: 2 } });
    expect(result.items).toHaveLength(2);
    expect(result.page.hasNext).toBe(true);
    expect(result.page.cursor).not.toBeNull();
    const decoded = decodeVendorSearchCursor(result.page.cursor!);
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(rows[1]!.id);
  });

  it('hasNext=false cuando el repository devuelve <= limit', async () => {
    const rows = [makeRow({}, 0)];
    const uc = new SearchVendorsUseCase(fakeRepo(rows), stubCategoryFound(null), stubLocationFound(null));
    const result = await uc.execute({ currentUser: ORG_USER, query: { limit: 20 } });
    expect(result.items).toHaveLength(1);
    expect(result.page.hasNext).toBe(false);
    expect(result.page.cursor).toBeNull();
  });

  it('empty state: items=[] con hasNext=false', async () => {
    const uc = new SearchVendorsUseCase(fakeRepo([]), stubCategoryFound(null), stubLocationFound(null));
    const result = await uc.execute({ currentUser: ORG_USER, query: { limit: 20 } });
    expect(result.items).toHaveLength(0);
    expect(result.page.hasNext).toBe(false);
    expect(result.page.cursor).toBeNull();
  });
});

function stubCategoryFound(id: string | null) {
  return { findActiveIdByCode: vi.fn().mockResolvedValue(id) };
}
function stubLocationFound(id: string | null) {
  return { findIdByCode: vi.fn().mockResolvedValue(id) };
}
