// US-042 (PB-P1-025 / QA-001 + QA-004) — Unit tests de:
// - DTO `ChangeVendorCategoriesRequestSchema` (strict + refine + rangos + duplicados).
// - Helper `setEquals` (D5 semantics).
// - `ChangeVendorCategoriesUseCase` (AC-01..04, EC-01..05, transacción, AdminAction, logs).
// - `toChangeVendorCategoriesResponse` (contract del shape del response).
import { describe, expect, it, vi } from 'vitest';
import { ChangeVendorCategoriesRequestSchema } from '../../src/modules/vendor-management/interface/dto/change-vendor-categories.request.js';
import { toChangeVendorCategoriesResponse } from '../../src/modules/vendor-management/interface/dto/change-vendor-categories.response.js';
import {
  CATEGORY_CHANGE_ADMIN_ACTION,
  CATEGORY_CHANGE_MAX,
  CATEGORY_CHANGE_TARGET_ENTITY,
  ChangeVendorCategoriesUseCase,
} from '../../src/modules/vendor-management/application/change-vendor-categories.use-case.js';
import { setEquals } from '../../src/modules/vendor-management/domain/set-equals.js';
import type {
  ServiceCategoryLookup,
  VendorProfileRepository,
  VendorProfileWithCategoriesSnapshot,
} from '../../src/modules/vendor-management/ports/vendor-profile.repository.js';
import type { AdminActionWritePort } from '../../src/modules/vendor-management/ports/admin-action-write.port.js';
import type { VendorProfileEventLogger } from '../../src/modules/vendor-management/application/vendor-profile-event-logger.js';
import type { VendorProfileView } from '../../src/modules/vendor-management/domain/vendor-profile.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import {
  CategoryChangeLimitError,
  InvalidCategoryError,
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
} from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import type { PrismaClient } from '@prisma/client';

const NOW = new Date('2026-07-15T12:00:00Z');
const clock: ClockPort = { now: () => NOW };
const USER_ID = '00000000-0000-0000-0000-0000000000a1';
const PROFILE_ID = '00000000-0000-0000-0000-0000000000v1';
const CAT_A = '11111111-1111-1111-1111-111111111111';
const CAT_B = '22222222-2222-2222-2222-222222222222';
const CAT_C = '33333333-3333-3333-3333-333333333333';
const CAT_INACTIVE = '99999999-9999-9999-9999-999999999999';
const CAT_UNKNOWN = '88888888-8888-8888-8888-888888888888';

// ── Fakes helpers ─────────────────────────────────────────────────────────
function snapshotFull(
  overrides: Partial<VendorProfileWithCategoriesSnapshot> = {},
): VendorProfileWithCategoriesSnapshot {
  return {
    id: PROFILE_ID,
    vendorUserId: USER_ID,
    status: 'approved',
    deletedAt: null,
    categoryChangeCount: 0,
    requiresAdminReview: false,
    lastCategoryChangeAt: null,
    categoryIds: [CAT_A, CAT_B],
    ...overrides,
  };
}

function view(overrides: Partial<VendorProfileView> = {}): VendorProfileView {
  return {
    id: PROFILE_ID,
    vendorUserId: USER_ID,
    businessName: 'Vendor',
    bio: 'x'.repeat(60),
    locationId: '00000000-0000-0000-0000-0000000000c1',
    languagesSupported: ['es-LATAM'],
    categories: [
      { id: CAT_A, name: 'Catering' },
      { id: CAT_B, name: 'Venue' },
    ],
    slug: 'vendor',
    status: 'approved',
    createdAt: NOW,
    ...overrides,
  };
}

function fakeRepo(
  overrides: Partial<VendorProfileRepository> = {},
  snap: VendorProfileWithCategoriesSnapshot = snapshotFull(),
): VendorProfileRepository {
  return {
    existsForUser: vi.fn(async () => true),
    findSlugsStartingWith: vi.fn(async () => []),
    create: vi.fn(async () => view()),
    findEditableByVendorUserId: vi.fn(async () => ({
      id: snap.id,
      vendorUserId: snap.vendorUserId,
      status: snap.status,
      deletedAt: snap.deletedAt,
    })),
    findAnyByVendorUserId: vi.fn(async () => ({
      id: snap.id,
      vendorUserId: snap.vendorUserId,
      status: snap.status,
      deletedAt: snap.deletedAt,
    })),
    update: vi.fn(async () => undefined),
    updateStatus: vi.fn(async () => undefined),
    softDelete: vi.fn(async () => undefined),
    findByIdWithCategories: vi.fn(async () => view({ status: snap.status })),
    findActiveWithCategoriesByVendorUserId: vi.fn(async () => snap),
    lockAndRereadForCategoryChange: vi.fn(async () => snap),
    replaceCategoriesAndAdvanceCounter: vi.fn(async () => ({
      categoryChangeCount: snap.categoryChangeCount + 1,
      requiresAdminReview: true,
      lastCategoryChangeAt: NOW,
    })),
    ...overrides,
  };
}

function fakeCategories(active: Record<string, boolean> = {}): ServiceCategoryLookup {
  return {
    findActiveIds: vi.fn(async (ids: readonly string[]) =>
      ids.filter((id) => active[id] === true).map((id) => ({ id, name: `cat-${id.slice(0, 4)}` })),
    ),
    findByIds: vi.fn(async (ids: readonly string[]) =>
      ids
        .filter((id) => id in active)
        .map((id) => ({ id, isActive: active[id] === true })),
    ),
  };
}

function fakeAdminActions(): AdminActionWritePort & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    create: vi.fn(async (input) => {
      calls.push(input);
    }),
  };
}

function fakeEvents(): VendorProfileEventLogger & { calls: { event: string; payload: unknown }[] } {
  const calls: { event: string; payload: unknown }[] = [];
  return {
    calls,
    emitProfileCreated: () => undefined,
    emitProfileUpdated: () => undefined,
    emitProfileRepending: () => undefined,
    emitProfileSoftDeleted: () => undefined,
    emitCategoryChanged: (ctx) => calls.push({ event: 'changed', payload: ctx }),
    emitCategoryNoop: (ctx) => calls.push({ event: 'noop', payload: ctx }),
    emitCategoryLimitReached: (ctx) => calls.push({ event: 'limit', payload: ctx }),
  };
}

function fakePrisma(): PrismaClient {
  return {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({} as unknown),
  } as unknown as PrismaClient;
}

// ── DTO ──────────────────────────────────────────────────────────────────
describe('US-042 ChangeVendorCategoriesRequestSchema', () => {
  it('EC-04: rechaza array vacío', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({ service_category_ids: [] });
    expect(r.success).toBe(false);
  });

  it('EC-04: rechaza más de 5 elementos', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({
      service_category_ids: [CAT_A, CAT_B, CAT_C, CAT_INACTIVE, CAT_UNKNOWN, '77777777-7777-7777-7777-777777777777'],
    });
    expect(r.success).toBe(false);
  });

  it('EC-04: rechaza duplicados', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({
      service_category_ids: [CAT_A, CAT_A],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza UUID inválido', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({
      service_category_ids: ['not-a-uuid'],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza claves extra (.strict)', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({
      service_category_ids: [CAT_A],
      extra: 'x',
    });
    expect(r.success).toBe(false);
  });

  it('acepta 1..5 UUIDs únicos', () => {
    const r = ChangeVendorCategoriesRequestSchema.safeParse({
      service_category_ids: [CAT_A, CAT_B, CAT_C],
    });
    expect(r.success).toBe(true);
  });
});

// ── setEquals ────────────────────────────────────────────────────────────
describe('US-042 setEquals', () => {
  it('true para conjuntos iguales', () => {
    expect(setEquals(new Set([CAT_A, CAT_B]), new Set([CAT_B, CAT_A]))).toBe(true);
  });
  it('false para conjuntos con tamaños distintos', () => {
    expect(setEquals(new Set([CAT_A]), new Set([CAT_A, CAT_B]))).toBe(false);
  });
  it('false para conjuntos disjuntos', () => {
    expect(setEquals(new Set([CAT_A]), new Set([CAT_B]))).toBe(false);
  });
  it('true para dos sets vacíos', () => {
    expect(setEquals(new Set<string>(), new Set<string>())).toBe(true);
  });
});

// ── UseCase ─────────────────────────────────────────────────────────────
describe('US-042 ChangeVendorCategoriesUseCase', () => {
  function build(
    snap: VendorProfileWithCategoriesSnapshot,
    catalog: Record<string, boolean> = { [CAT_A]: true, [CAT_B]: true, [CAT_C]: true, [CAT_INACTIVE]: false },
  ) {
    const repo = fakeRepo({}, snap);
    const admin = fakeAdminActions();
    const events = fakeEvents();
    const uc = new ChangeVendorCategoriesUseCase(
      repo,
      fakeCategories(catalog),
      admin,
      clock,
      events,
      fakePrisma(),
    );
    return { uc, repo, admin, events };
  }

  it('EC-03: perfil inexistente → VendorProfileNotFoundError', async () => {
    const repo = fakeRepo({
      findActiveWithCategoriesByVendorUserId: vi.fn(async () => null),
    });
    const uc = new ChangeVendorCategoriesUseCase(
      repo,
      fakeCategories(),
      fakeAdminActions(),
      clock,
      fakeEvents(),
      fakePrisma(),
    );
    await expect(
      uc.execute({ vendorUserId: USER_ID, serviceCategoryIds: [CAT_A] }),
    ).rejects.toBeInstanceOf(VendorProfileNotFoundError);
  });

  it('EC-02: perfil hidden → VendorProfileHiddenError', async () => {
    const { uc } = build(snapshotFull({ status: 'hidden' }));
    await expect(
      uc.execute({ vendorUserId: USER_ID, serviceCategoryIds: [CAT_C] }),
    ).rejects.toBeInstanceOf(VendorProfileHiddenError);
  });

  it('EC-01: noop cuando el set es idéntico — no persiste, no cuenta, no AdminAction', async () => {
    const { uc, repo, admin, events } = build(snapshotFull({ categoryIds: [CAT_A, CAT_B] }));
    const result = await uc.execute({
      vendorUserId: USER_ID,
      serviceCategoryIds: [CAT_B, CAT_A],
    });
    expect(result.noop).toBe(true);
    expect(repo.replaceCategoriesAndAdvanceCounter).not.toHaveBeenCalled();
    expect(admin.create).not.toHaveBeenCalled();
    expect(events.calls.find((c) => c.event === 'noop')).toBeDefined();
    expect(events.calls.find((c) => c.event === 'changed')).toBeUndefined();
  });

  it('AC-02 / D1: contador >= 5 → CategoryChangeLimitError + log warn', async () => {
    const { uc, events } = build(
      snapshotFull({ categoryChangeCount: 5, categoryIds: [CAT_A] }),
    );
    await expect(
      uc.execute({ vendorUserId: USER_ID, serviceCategoryIds: [CAT_B] }),
    ).rejects.toBeInstanceOf(CategoryChangeLimitError);
    expect(events.calls.find((c) => c.event === 'limit')).toBeDefined();
  });

  it('EC-05: categoría inexistente o inactiva → InvalidCategoryError con ids problemáticos', async () => {
    const { uc } = build(snapshotFull({ categoryIds: [CAT_A] }));
    try {
      await uc.execute({ vendorUserId: USER_ID, serviceCategoryIds: [CAT_INACTIVE, CAT_UNKNOWN] });
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidCategoryError);
      const details = (err as InvalidCategoryError).unknownOrInactive;
      expect(details).toEqual(expect.arrayContaining([CAT_INACTIVE, CAT_UNKNOWN]));
    }
  });

  it('AC-01: approved + diff → transición pending, AdminAction, evento changed, repending=true', async () => {
    const { uc, repo, admin, events } = build(
      snapshotFull({ status: 'approved', categoryIds: [CAT_A] }),
    );
    const result = await uc.execute(
      { vendorUserId: USER_ID, serviceCategoryIds: [CAT_B, CAT_C] },
      { correlationId: 'corr-1' },
    );
    expect(result.noop).toBe(false);
    expect(result.repending).toBe(true);
    expect(result.newStatus).toBe('pending');
    expect(repo.replaceCategoriesAndAdvanceCounter).toHaveBeenCalledTimes(1);
    expect(repo.updateStatus).toHaveBeenCalledWith(PROFILE_ID, 'pending', expect.anything());
    expect(admin.create).toHaveBeenCalledTimes(1);
    expect(admin.calls[0]).toMatchObject({
      action: CATEGORY_CHANGE_ADMIN_ACTION,
      targetEntity: CATEGORY_CHANGE_TARGET_ENTITY,
      targetId: PROFILE_ID,
      actorUserId: USER_ID,
      actorRole: 'vendor',
      correlationId: 'corr-1',
    });
    const changed = events.calls.find((c) => c.event === 'changed');
    expect(changed).toBeDefined();
  });

  it('AC-03: pending + diff → sin transición, aplica cambios + AdminAction', async () => {
    const { uc, repo, admin } = build(
      snapshotFull({ status: 'pending', categoryIds: [CAT_A] }),
    );
    const result = await uc.execute({
      vendorUserId: USER_ID,
      serviceCategoryIds: [CAT_B],
    });
    expect(result.repending).toBe(false);
    expect(result.newStatus).toBe('pending');
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(admin.create).toHaveBeenCalledTimes(1);
  });

  it('AC-04: rejected + diff → transición pending + AdminAction + repending=true', async () => {
    const { uc, repo, admin } = build(
      snapshotFull({ status: 'rejected', categoryIds: [CAT_A] }),
    );
    const result = await uc.execute({
      vendorUserId: USER_ID,
      serviceCategoryIds: [CAT_B],
    });
    expect(result.repending).toBe(true);
    expect(result.newStatus).toBe('pending');
    expect(repo.updateStatus).toHaveBeenCalledWith(PROFILE_ID, 'pending', expect.anything());
    expect(admin.create).toHaveBeenCalledTimes(1);
  });

  it('CATEGORY_CHANGE_MAX exporta el tope acumulado (5) alineado con la DB', () => {
    expect(CATEGORY_CHANGE_MAX).toBe(5);
  });
});

// ── Contract test: toChangeVendorCategoriesResponse (QA-004) ─────────────
describe('US-042 QA-004 — response contract', () => {
  it('emite el shape estable { profile, repending, noop, category_change_count, requires_admin_review, status, last_category_change_at }', () => {
    const response = toChangeVendorCategoriesResponse({
      profile: view({ status: 'pending' }),
      repending: true,
      noop: false,
      categoryChangeCount: 1,
      requiresAdminReview: true,
      lastCategoryChangeAt: NOW,
    });
    expect(Object.keys(response).sort()).toEqual(
      [
        'category_change_count',
        'last_category_change_at',
        'noop',
        'profile',
        'repending',
        'requires_admin_review',
        'status',
      ].sort(),
    );
    expect(response.profile.id).toBe(PROFILE_ID);
    expect(response.status).toBe('pending');
    expect(response.last_category_change_at).toBe('2026-07-15T12:00:00.000Z');
    expect(response.repending).toBe(true);
    expect(response.noop).toBe(false);
  });

  it('noop=true con last_category_change_at=null respeta el shape', () => {
    const response = toChangeVendorCategoriesResponse({
      profile: view(),
      repending: false,
      noop: true,
      categoryChangeCount: 0,
      requiresAdminReview: false,
      lastCategoryChangeAt: null,
    });
    expect(response.last_category_change_at).toBeNull();
    expect(response.noop).toBe(true);
  });
});
