// US-077 (PB-P1-040 / QA-001) — Unit tests del `ListReviewsForAdminUseCase` + DTO + Mapper.
//
// Cobertura:
//   DTO (`AdminReviewsQuerySchema`):
//     - Multi-status como array o string simple.
//     - Rangos rating (VR-03) + cross-field refine.
//     - Rangos fecha (VR-04) + cross-field refine.
//     - Coerce booleano `has_admin_action`.
//     - PageSize default 25 + límites 1..50 (VR-01).
//     - `.strict()` rechaza claves ajenas.
//
//   Mapper (`toAdminReviewListItem`):
//     - Expone PII completa (Decisión PO D4 / SEC-03) — NO anonimato.
//     - `displayName` = fullName ?? email.
//     - `lastAdminAction` derivado del chain + `metadata.reason` (BR-ADMIN-011).
//
//   UseCase branches (Decisión PO D2/D3):
//     - Happy path sin filtros: findMany con `take: pageSize + 1`.
//     - Filtro multi-status ⇒ where.status IN.
//     - Filtro vendor_id ⇒ where.vendorProfileId.
//     - Filtros fecha ⇒ where.createdAt gte/lte.
//     - Filtros rating ⇒ where.rating gte/lte.
//     - has_admin_action true/false ⇒ where.adminActionId.
//     - Cursor válido ⇒ WHERE AND[OR] keyset.
//     - Cursor inválido ⇒ Us066InvalidCursorError.
//     - hasMore true ⇒ nextCursor encode; hasMore false ⇒ nextCursor null.
import { describe, expect, it, vi } from 'vitest';
import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';
import { ListReviewsForAdminUseCase } from '../../src/modules/reviews-moderation/application/list-reviews-for-admin.use-case.js';
import { AdminReviewsQuerySchema } from '../../src/modules/reviews-moderation/interface/admin-reviews-query.dto.js';
import {
  toAdminReviewListItem,
  type AdminReviewMapperInput,
} from '../../src/modules/reviews-moderation/application/admin-review.mapper.js';
import { Us066InvalidCursorError } from '../../src/modules/reviews-moderation/domain/us066.errors.js';
import { encodeVendorReviewsCursor } from '../../src/modules/reviews-moderation/application/vendor-reviews-cursor.js';

// ── DTO ────────────────────────────────────────────────────────────────────

describe('US-077 · AdminReviewsQuerySchema', () => {
  it('acepta empty ⇒ pageSize default 25', () => {
    const r = AdminReviewsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.pageSize).toBe(25);
  });

  it('acepta status como string simple ⇒ normaliza a array', () => {
    const r = AdminReviewsQuerySchema.safeParse({ status: 'hidden' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toEqual(['hidden']);
  });

  it('acepta status como array multi', () => {
    const r = AdminReviewsQuerySchema.safeParse({ status: ['published', 'hidden'] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toEqual(['published', 'hidden']);
  });

  it('rechaza status inválido (VR-05)', () => {
    expect(AdminReviewsQuerySchema.safeParse({ status: 'deleted' }).success).toBe(false);
    expect(AdminReviewsQuerySchema.safeParse({ status: 'wrong' }).success).toBe(false);
  });

  it('coerce pageSize desde string y aplica límites (VR-01)', () => {
    expect(AdminReviewsQuerySchema.safeParse({ pageSize: '10' }).success).toBe(true);
    expect(AdminReviewsQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
    expect(AdminReviewsQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
  });

  it('cross-field refine rating_min > rating_max ⇒ error INVALID_FILTERS', () => {
    const r = AdminReviewsQuerySchema.safeParse({ rating_min: 4, rating_max: 2 });
    expect(r.success).toBe(false);
  });

  it('cross-field refine created_at_from > created_at_to ⇒ error INVALID_FILTERS', () => {
    const r = AdminReviewsQuerySchema.safeParse({
      created_at_from: '2026-06-02T00:00:00Z',
      created_at_to: '2026-06-01T00:00:00Z',
    });
    expect(r.success).toBe(false);
  });

  it('coerce has_admin_action desde string "true"/"false"', () => {
    expect(AdminReviewsQuerySchema.parse({ has_admin_action: 'true' }).has_admin_action).toBe(true);
    expect(AdminReviewsQuerySchema.parse({ has_admin_action: 'false' }).has_admin_action).toBe(
      false,
    );
  });

  it('.strict() rechaza claves ajenas', () => {
    expect(AdminReviewsQuerySchema.safeParse({ extra: 1 }).success).toBe(false);
  });

  it('VR-06 rechaza vendor_id no UUID', () => {
    expect(AdminReviewsQuerySchema.safeParse({ vendor_id: 'not-uuid' }).success).toBe(false);
  });
});

// ── Mapper ────────────────────────────────────────────────────────────────

const REVIEW_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const VENDOR_ID = '33333333-3333-4333-8333-333333333333';
const AUTHOR_ID = '55555555-5555-4555-8555-555555555555';
const EVENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CREATED_AT = new Date('2026-06-20T12:00:00Z');

function baseRow(overrides: Partial<AdminReviewMapperInput> = {}): AdminReviewMapperInput {
  return {
    id: REVIEW_ID,
    rating: 5,
    comment: 'Excelente servicio',
    status: 'published',
    createdAt: CREATED_AT,
    author: { id: AUTHOR_ID, fullName: 'Juan Pérez', email: 'juan@test.com' },
    vendorProfile: { id: VENDOR_ID, businessName: 'Vendor SA', slug: 'vendor-sa' },
    bookingIntent: { event: { id: EVENT_ID, title: 'Boda' } },
    adminAction: null,
    ...overrides,
  } as AdminReviewMapperInput;
}

describe('US-077 · toAdminReviewListItem (SEC-03 PII completa)', () => {
  it('mapea PII completa sin anonimato', () => {
    const view = toAdminReviewListItem(baseRow());
    expect(view.author.userId).toBe(AUTHOR_ID);
    expect(view.author.displayName).toBe('Juan Pérez');
    expect(view.vendor.businessName).toBe('Vendor SA');
    expect(view.vendor.slug).toBe('vendor-sa');
    expect(view.event.title).toBe('Boda');
    expect(view.event.id).toBe(EVENT_ID);
    expect(view.lastAdminAction).toBeNull();
  });

  it('displayName fallback a email cuando fullName es null', () => {
    const view = toAdminReviewListItem(
      baseRow({ author: { id: AUTHOR_ID, fullName: null, email: 'anon@test.com' } }),
    );
    expect(view.author.displayName).toBe('anon@test.com');
  });

  it('lastAdminAction con reason desde metadata (BR-ADMIN-011)', () => {
    const view = toAdminReviewListItem(
      baseRow({
        status: 'hidden',
        adminAction: {
          action: 'hide',
          adminUserId: ADMIN_ID,
          createdAt: new Date('2026-06-25T12:00:00Z'),
          metadata: { reason: 'Contenido inapropiado', from_status: 'published' },
        },
      }),
    );
    expect(view.lastAdminAction).not.toBeNull();
    expect(view.lastAdminAction?.action).toBe('hide');
    expect(view.lastAdminAction?.reason).toBe('Contenido inapropiado');
    expect(view.lastAdminAction?.adminId).toBe(ADMIN_ID);
  });

  it('lastAdminAction sin metadata.reason ⇒ reason=null', () => {
    const view = toAdminReviewListItem(
      baseRow({
        adminAction: {
          action: 'hide',
          adminUserId: ADMIN_ID,
          createdAt: CREATED_AT,
          metadata: null,
        },
      }),
    );
    expect(view.lastAdminAction?.reason).toBeNull();
  });
});

// ── UseCase ────────────────────────────────────────────────────────────────

interface BuildUcOpts {
  rows?: AdminReviewMapperInput[];
}

function buildUc(opts: BuildUcOpts = {}) {
  const findManySpy = vi.fn<(args: PrismaTypes.ReviewFindManyArgs) => Promise<AdminReviewMapperInput[]>>(
    async () => opts.rows ?? [],
  );
  const prismaMock = {
    review: { findMany: findManySpy },
  };
  const uc = new ListReviewsForAdminUseCase(prismaMock as never);
  return { uc, findManySpy };
}

function row(i: number): AdminReviewMapperInput {
  return {
    id: `00000000-0000-0000-0077-${String(i).padStart(12, '0')}`,
    rating: 1 + (i % 5),
    comment: `c${i}`,
    status: 'published',
    createdAt: new Date(2026, 5, 20 - i, 12, 0, 0),
    author: { id: AUTHOR_ID, fullName: `Author ${i}`, email: 'a@test.com' },
    vendorProfile: { id: VENDOR_ID, businessName: `V${i}`, slug: 'v' },
    bookingIntent: { event: { id: EVENT_ID, title: `E${i}` } },
    adminAction: null,
  } as AdminReviewMapperInput;
}

describe('US-077 · ListReviewsForAdminUseCase.execute', () => {
  it('AC-01 happy path sin filtros ⇒ take pageSize+1, sin cursor de retorno cuando <=pageSize', async () => {
    const { uc, findManySpy } = buildUc({ rows: [row(1), row(2), row(3)] });
    const result = await uc.execute({ pageSize: 25 });
    expect(findManySpy).toHaveBeenCalledTimes(1);
    const args = findManySpy.mock.calls[0]![0];
    expect(args.take).toBe(26);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(args.where?.deletedAt).toBeNull();
    expect(result.items).toHaveLength(3);
    expect(result.pagination.nextCursor).toBeNull();
    expect(result.pagination.pageSize).toBe(25);
  });

  it('hasMore true ⇒ nextCursor encode desde el último item', async () => {
    const rows = [row(1), row(2), row(3), row(4)]; // pageSize=3 ⇒ take=4 => hasMore
    const { uc } = buildUc({ rows });
    const result = await uc.execute({ pageSize: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.pagination.nextCursor).not.toBeNull();
  });

  it('filtro multi-status ⇒ where.status.in', async () => {
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, status: ['published', 'hidden'] });
    const args = findManySpy.mock.calls[0]![0];
    expect(args.where?.status).toEqual({ in: ['published', 'hidden'] });
  });

  it('filtro vendor_id ⇒ where.vendorProfileId', async () => {
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, vendor_id: VENDOR_ID });
    expect(findManySpy.mock.calls[0]![0].where?.vendorProfileId).toBe(VENDOR_ID);
  });

  it('filtro fechas ⇒ where.createdAt gte/lte', async () => {
    const { uc, findManySpy } = buildUc();
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-30T23:59:59Z');
    await uc.execute({ pageSize: 25, created_at_from: from, created_at_to: to });
    const cAt = findManySpy.mock.calls[0]![0].where?.createdAt as { gte?: Date; lte?: Date };
    expect(cAt.gte).toBe(from);
    expect(cAt.lte).toBe(to);
  });

  it('filtro rating ⇒ where.rating gte/lte', async () => {
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, rating_min: 3, rating_max: 5 });
    expect(findManySpy.mock.calls[0]![0].where?.rating).toEqual({ gte: 3, lte: 5 });
  });

  it('has_admin_action=true ⇒ where.adminActionId.not null', async () => {
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, has_admin_action: true });
    expect(findManySpy.mock.calls[0]![0].where?.adminActionId).toEqual({ not: null });
  });

  it('has_admin_action=false ⇒ where.adminActionId null', async () => {
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, has_admin_action: false });
    expect(findManySpy.mock.calls[0]![0].where?.adminActionId).toBeNull();
  });

  it('cursor válido ⇒ keyset predicate en where.AND[OR]', async () => {
    const cursor = encodeVendorReviewsCursor({
      createdAt: new Date('2026-06-15T10:00:00Z'),
      id: REVIEW_ID,
    });
    const { uc, findManySpy } = buildUc();
    await uc.execute({ pageSize: 25, cursor });
    const andClause = (findManySpy.mock.calls[0]![0].where as PrismaTypes.ReviewWhereInput)
      .AND as PrismaTypes.ReviewWhereInput[];
    expect(Array.isArray(andClause)).toBe(true);
    expect(andClause[0]!.OR).toBeDefined();
  });

  it('cursor inválido ⇒ Us066InvalidCursorError', async () => {
    const { uc } = buildUc();
    await expect(uc.execute({ pageSize: 25, cursor: '###not-base64###' })).rejects.toBeInstanceOf(
      Us066InvalidCursorError,
    );
  });
});

// Guard TS-only: nunca referenciar Prisma en runtime del test — tipo `Prisma.ReviewWhereInput` usado
// arriba proviene sólo del import de tipos.
void Prisma;
