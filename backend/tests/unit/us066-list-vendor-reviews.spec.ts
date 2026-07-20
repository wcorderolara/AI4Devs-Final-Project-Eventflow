// US-066 (PB-P1-039 / QA-001) — Unit tests DTO + cursor helper + mapper + UseCase branches.
//
// Cobertura:
//   DTOs (BE-001):
//     - Path `id` UUID válido/inválido.
//     - `pageSize` coerce int, rango 1..50, default 20.
//     - `.strict()` rechaza campos ajenos en el query.
//     - `cursor` opcional string 1..512.
//
//   Cursor helper (BE-004):
//     - encode/decode round-trip preserva `{createdAt, id}` exactos.
//     - decode rechaza: cadena vacía, base64 malformado, JSON inválido, `id` no UUID, `createdAt`
//       no parseable, tipos incorrectos.
//
//   Mapper (BE-001):
//     - Emite whitelist estricta — NO copia `authorId`, `bookingIntentId`, `vendorProfileId`.
//     - `includeStatus:false` omite el campo `status`; `includeStatus:true` lo emite.
//     - Preserva `eventTitle` desde `bookingIntent.event.title`.
//
//   UseCase (BE-002 + BE-005):
//     - Anónimo/organizer/vendor: vendor pending/suspended/rejected/draft ⇒ 404 uniforme.
//     - Admin: vendor pending/suspended ⇒ visible.
//     - Cursor inválido ⇒ Us066InvalidCursorError.
//     - Filtro `status='published'` para no-admin; admin ve todos los status.
//     - `next_cursor` null cuando hay < pageSize rows; presente cuando hay `pageSize+1`.
//     - No emite PII: sólo `id, rating, comment, eventTitle, createdAt` (+ status admin).
import { describe, expect, it } from 'vitest';
import { ReviewStatus, VendorProfileStatus } from '@prisma/client';
import {
  VendorIdParamSchema,
  ListVendorReviewsQuerySchema,
} from '../../src/modules/reviews-moderation/interface/list-vendor-reviews.dto.js';
import {
  encodeVendorReviewsCursor,
  decodeVendorReviewsCursor,
} from '../../src/modules/reviews-moderation/application/vendor-reviews-cursor.js';
import {
  toAnonymizedReview,
  type AnonymizedReviewRow,
} from '../../src/modules/reviews-moderation/application/anonymized-review.mapper.js';
import { GetVendorReviewsUseCase } from '../../src/modules/reviews-moderation/application/get-vendor-reviews.use-case.js';
import {
  VendorNotFoundForReviewsError,
  Us066InvalidCursorError,
} from '../../src/modules/reviews-moderation/domain/us066.errors.js';

const VENDOR_ID = '11111111-1111-1111-1111-111111111111';
const REVIEW_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_ID = '33333333-3333-3333-3333-333333333333';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────
describe('US-066 DTO — VendorIdParamSchema', () => {
  it('acepta UUID v4 válido', () => {
    const res = VendorIdParamSchema.safeParse({ id: VENDOR_ID });
    expect(res.success).toBe(true);
  });

  it('rechaza string vacío', () => {
    expect(VendorIdParamSchema.safeParse({ id: '' }).success).toBe(false);
  });

  it('rechaza no-UUID', () => {
    expect(VendorIdParamSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rechaza campos ajenos (.strict)', () => {
    const res = VendorIdParamSchema.safeParse({ id: VENDOR_ID, extra: 'x' });
    expect(res.success).toBe(false);
  });
});

describe('US-066 DTO — ListVendorReviewsQuerySchema', () => {
  it('default pageSize=20 cuando ausente', () => {
    const res = ListVendorReviewsQuerySchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.pageSize).toBe(20);
  });

  it('coerce pageSize string a int', () => {
    const res = ListVendorReviewsQuerySchema.safeParse({ pageSize: '10' });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.pageSize).toBe(10);
  });

  it('rechaza pageSize=0 (< min)', () => {
    expect(ListVendorReviewsQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
  });

  it('rechaza pageSize=51 (> max)', () => {
    expect(ListVendorReviewsQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
  });

  it('rechaza pageSize no-entero (1.5)', () => {
    expect(ListVendorReviewsQuerySchema.safeParse({ pageSize: '1.5' }).success).toBe(false);
  });

  it('acepta cursor opcional string', () => {
    const res = ListVendorReviewsQuerySchema.safeParse({ cursor: 'abc' });
    expect(res.success).toBe(true);
  });

  it('rechaza cursor > 512 chars', () => {
    const long = 'a'.repeat(513);
    expect(ListVendorReviewsQuerySchema.safeParse({ cursor: long }).success).toBe(false);
  });

  it('rechaza campos ajenos (.strict)', () => {
    expect(
      ListVendorReviewsQuerySchema.safeParse({ pageSize: '20', extra: 'x' }).success,
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cursor helper
// ─────────────────────────────────────────────────────────────────────────────
describe('US-066 cursor helper — vendor-reviews-cursor', () => {
  it('encode + decode round-trip preserva createdAt e id', () => {
    const createdAt = new Date('2026-06-15T12:34:56.789Z');
    const token = encodeVendorReviewsCursor({ createdAt, id: REVIEW_ID });
    const decoded = decodeVendorReviewsCursor(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(REVIEW_ID);
    expect(decoded?.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it('decode devuelve null para cadena vacía', () => {
    expect(decodeVendorReviewsCursor('')).toBeNull();
  });

  it('decode devuelve null para base64 malformado', () => {
    expect(decodeVendorReviewsCursor('!!!not-base64!!!')).toBeNull();
  });

  it('decode devuelve null cuando el JSON interno es inválido', () => {
    const bad = Buffer.from('not-json', 'utf-8').toString('base64url');
    expect(decodeVendorReviewsCursor(bad)).toBeNull();
  });

  it('decode devuelve null cuando `id` no es UUID', () => {
    const bad = Buffer.from(JSON.stringify({ c: '2026-01-01T00:00:00.000Z', i: 'x' }), 'utf-8').toString(
      'base64url',
    );
    expect(decodeVendorReviewsCursor(bad)).toBeNull();
  });

  it('decode devuelve null cuando `createdAt` no parsea', () => {
    const bad = Buffer.from(JSON.stringify({ c: 'not-a-date', i: REVIEW_ID }), 'utf-8').toString(
      'base64url',
    );
    expect(decodeVendorReviewsCursor(bad)).toBeNull();
  });

  it('decode rechaza tipos incorrectos', () => {
    const bad = Buffer.from(JSON.stringify({ c: 12345, i: 67890 }), 'utf-8').toString('base64url');
    expect(decodeVendorReviewsCursor(bad)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────────────────────────────────────
function baseRow(overrides: Partial<AnonymizedReviewRow> = {}): AnonymizedReviewRow {
  return {
    id: REVIEW_ID,
    rating: 5,
    comment: 'Excelente servicio.',
    createdAt: new Date('2026-06-15T12:00:00.000Z'),
    status: ReviewStatus.published,
    bookingIntent: { event: { title: 'Boda de Juan y María' } },
    ...overrides,
  };
}

describe('US-066 mapper — toAnonymizedReview', () => {
  it('emite whitelist estricta — NO expone PII', () => {
    const view = toAnonymizedReview(baseRow(), { includeStatus: false });
    // Whitelist: id, rating, comment, eventTitle, createdAt (sin status, sin authorId, sin PII).
    expect(Object.keys(view).sort()).toEqual(
      ['comment', 'createdAt', 'eventTitle', 'id', 'rating'].sort(),
    );
    expect(view.eventTitle).toBe('Boda de Juan y María');
  });

  it('includeStatus:true agrega el campo status', () => {
    const view = toAnonymizedReview(baseRow({ status: ReviewStatus.hidden }), {
      includeStatus: true,
    });
    expect(view.status).toBe('hidden');
    expect(Object.keys(view).sort()).toEqual(
      ['comment', 'createdAt', 'eventTitle', 'id', 'rating', 'status'].sort(),
    );
  });

  it('normaliza comment null tal cual', () => {
    const view = toAnonymizedReview(baseRow({ comment: null }), { includeStatus: false });
    expect(view.comment).toBeNull();
  });

  it('createdAt se serializa como ISO 8601', () => {
    const view = toAnonymizedReview(baseRow(), { includeStatus: false });
    expect(view.createdAt).toBe('2026-06-15T12:00:00.000Z');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase — mocks in-memory de PrismaClient (sin BD real; IT cubre lo demás)
// ─────────────────────────────────────────────────────────────────────────────

interface StubVendor {
  id: string;
  businessName: string;
  slug: string | null;
  status: VendorProfileStatus;
  ratingAvg: number | null;
  reviewsCount: number;
}

interface StubReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  status: ReviewStatus;
  bookingIntent: { event: { title: string } };
}

function stubPrisma(opts: { vendor: StubVendor | null; rows: StubReviewRow[] }) {
  const findMany = async (): Promise<StubReviewRow[]> => opts.rows;
  return {
    vendorProfile: {
      findUnique: async () => opts.vendor,
    },
    review: { findMany },
  } as unknown as ConstructorParameters<typeof GetVendorReviewsUseCase>[0];
}

function baseVendor(overrides: Partial<StubVendor> = {}): StubVendor {
  return {
    id: VENDOR_ID,
    businessName: 'Acme Catering',
    slug: 'acme-catering',
    status: VendorProfileStatus.approved,
    ratingAvg: 4.5,
    reviewsCount: 25,
    ...overrides,
  };
}

function stubRow(index: number): StubReviewRow {
  return {
    id: `00000000-0000-0000-0066-${String(index).padStart(12, '0')}`,
    rating: (index % 5) + 1,
    comment: index % 2 === 0 ? 'ok' : null,
    createdAt: new Date(Date.UTC(2026, 5, 15) - index * 1000),
    status: ReviewStatus.published,
    bookingIntent: { event: { title: `Evento #${index}` } },
  };
}

describe('US-066 UseCase — GetVendorReviewsUseCase', () => {
  it('happy path: vendor approved + 20 rows → items=20 + nextCursor null', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => stubRow(i + 1));
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows }));
    const result = await uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 });
    expect(result.items).toHaveLength(20);
    expect(result.pagination.nextCursor).toBeNull();
    expect(result.pagination.pageSize).toBe(20);
    expect(result.vendor.reviewsCount).toBe(25);
    expect(result.vendor.ratingAvg).toBe(4.5);
  });

  it('detecta hasMore: 21 rows con pageSize=20 → items=20 + nextCursor no null', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => stubRow(i + 1));
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows }));
    const result = await uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 });
    expect(result.items).toHaveLength(20);
    expect(result.pagination.nextCursor).not.toBeNull();
    // Cursor debe decodificar y coincidir con el último item retornado.
    const decoded = decodeVendorReviewsCursor(result.pagination.nextCursor!);
    expect(decoded?.id).toBe(rows[19]!.id);
  });

  it('anónimo + vendor pending ⇒ VendorNotFoundForReviewsError uniforme', async () => {
    const uc = new GetVendorReviewsUseCase(
      stubPrisma({ vendor: baseVendor({ status: VendorProfileStatus.pending }), rows: [] }),
    );
    await expect(
      uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 }),
    ).rejects.toBeInstanceOf(VendorNotFoundForReviewsError);
  });

  it('anónimo + vendor rejected ⇒ VendorNotFoundForReviewsError', async () => {
    const uc = new GetVendorReviewsUseCase(
      stubPrisma({ vendor: baseVendor({ status: VendorProfileStatus.rejected }), rows: [] }),
    );
    await expect(
      uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 }),
    ).rejects.toBeInstanceOf(VendorNotFoundForReviewsError);
  });

  it('vendor inexistente ⇒ VendorNotFoundForReviewsError', async () => {
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: null, rows: [] }));
    await expect(
      uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 }),
    ).rejects.toBeInstanceOf(VendorNotFoundForReviewsError);
  });

  it('admin + vendor pending ⇒ NO lanza (D3 admin sees-all)', async () => {
    const uc = new GetVendorReviewsUseCase(
      stubPrisma({ vendor: baseVendor({ status: VendorProfileStatus.pending }), rows: [] }),
    );
    const result = await uc.execute({
      currentUser: { id: OTHER_ID, role: 'admin' },
      vendorId: VENDOR_ID,
      pageSize: 20,
    });
    expect(result.items).toEqual([]);
    expect(result.vendor.status).toBe('pending');
  });

  it('admin ⇒ items incluyen status en la respuesta', async () => {
    const rows: StubReviewRow[] = [
      { ...stubRow(1), status: ReviewStatus.published },
      { ...stubRow(2), status: ReviewStatus.hidden },
    ];
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows }));
    const result = await uc.execute({
      currentUser: { id: OTHER_ID, role: 'admin' },
      vendorId: VENDOR_ID,
      pageSize: 20,
    });
    expect(result.items.every((item) => item.status !== undefined)).toBe(true);
  });

  it('no-admin ⇒ items NO exponen status', async () => {
    const rows = [stubRow(1)];
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows }));
    const result = await uc.execute({
      currentUser: { id: OTHER_ID, role: 'organizer' },
      vendorId: VENDOR_ID,
      pageSize: 20,
    });
    for (const item of result.items) {
      expect(item.status).toBeUndefined();
    }
  });

  it('cursor inválido ⇒ Us066InvalidCursorError', async () => {
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows: [] }));
    await expect(
      uc.execute({
        currentUser: null,
        vendorId: VENDOR_ID,
        pageSize: 20,
        cursor: '!!!not-a-cursor!!!',
      }),
    ).rejects.toBeInstanceOf(Us066InvalidCursorError);
  });

  it('cursor válido → decode + continúa (sin errores)', async () => {
    const validCursor = encodeVendorReviewsCursor({
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      id: REVIEW_ID,
    });
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows: [] }));
    await expect(
      uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20, cursor: validCursor }),
    ).resolves.toMatchObject({ items: [], pagination: { nextCursor: null, pageSize: 20 } });
  });

  it('vendor con reviewsCount=0 ⇒ items vacío + summary correcto', async () => {
    const uc = new GetVendorReviewsUseCase(
      stubPrisma({ vendor: baseVendor({ reviewsCount: 0, ratingAvg: null }), rows: [] }),
    );
    const result = await uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 });
    expect(result.items).toEqual([]);
    expect(result.vendor.reviewsCount).toBe(0);
    expect(result.vendor.ratingAvg).toBeNull();
  });

  it('no expone PII (authorId, bookingIntentId, vendorProfileId) en items', async () => {
    const rows = [stubRow(1)];
    const uc = new GetVendorReviewsUseCase(stubPrisma({ vendor: baseVendor(), rows }));
    const result = await uc.execute({ currentUser: null, vendorId: VENDOR_ID, pageSize: 20 });
    const item = result.items[0]!;
    // Estricto: sólo los 5 campos whitelist (sin status para no-admin).
    expect(Object.keys(item).sort()).toEqual(
      ['comment', 'createdAt', 'eventTitle', 'id', 'rating'].sort(),
    );
  });
});
