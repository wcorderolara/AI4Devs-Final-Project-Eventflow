// US-041 (PB-P1-024 / QA-001) — Unit tests de:
// - DTO `UpdateVendorProfileRequestSchema` (strict + refine + rangos).
// - `hasMajorField` (D1).
// - `UpdateVendorProfileUseCase` (AC-01..04, EC-01..08).
// - `SoftDeleteVendorProfileUseCase` (AC-05, EC-04, EC-05, NT-10).
import { describe, expect, it, vi } from 'vitest';
import { UpdateVendorProfileRequestSchema, hasMajorField } from '../../src/modules/vendor-management/interface/dto/update-vendor-profile.request.js';
import { UpdateVendorProfileUseCase } from '../../src/modules/vendor-management/application/update-vendor-profile.use-case.js';
import { SoftDeleteVendorProfileUseCase } from '../../src/modules/vendor-management/application/soft-delete-vendor-profile.use-case.js';
import type {
  LocationReader,
  VendorProfileEditableSnapshot,
  VendorProfileRepository,
} from '../../src/modules/vendor-management/ports/vendor-profile.repository.js';
import type { AdminActionWritePort } from '../../src/modules/vendor-management/ports/admin-action-write.port.js';
import type { VendorProfileEventLogger } from '../../src/modules/vendor-management/application/vendor-profile-event-logger.js';
import type { VendorProfileView } from '../../src/modules/vendor-management/domain/vendor-profile.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import {
  VendorProfileAlreadyDeletedError,
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
  VendorProfileRejectedError,
} from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import type { PrismaClient } from '@prisma/client';

const NOW = new Date('2026-07-15T12:00:00Z');
const clock: ClockPort = { now: () => NOW };
const USER_ID = '00000000-0000-0000-0000-0000000000a1';
const PROFILE_ID = '00000000-0000-0000-0000-0000000000v1';
const LOCATION_ID = '00000000-0000-0000-0000-0000000000c1';

// ── Fakes helpers ─────────────────────────────────────────────────────────
function snapshot(overrides: Partial<VendorProfileEditableSnapshot> = {}): VendorProfileEditableSnapshot {
  return {
    id: PROFILE_ID,
    vendorUserId: USER_ID,
    status: 'approved',
    deletedAt: null,
    ...overrides,
  };
}

function view(overrides: Partial<VendorProfileView> = {}): VendorProfileView {
  return {
    id: PROFILE_ID,
    vendorUserId: USER_ID,
    businessName: 'Acme Catering',
    bio: 'x'.repeat(60),
    locationId: LOCATION_ID,
    languagesSupported: ['es-LATAM'],
    categories: [],
    slug: 'acme-catering',
    status: 'approved',
    createdAt: NOW,
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<VendorProfileRepository> = {}): VendorProfileRepository {
  return {
    existsForUser: vi.fn(async () => true),
    findSlugsStartingWith: vi.fn(async () => []),
    create: vi.fn(async () => view()),
    findEditableByVendorUserId: vi.fn(async () => snapshot()),
    findAnyByVendorUserId: vi.fn(async () => snapshot()),
    update: vi.fn(async () => undefined),
    updateStatus: vi.fn(async () => undefined),
    softDelete: vi.fn(async () => undefined),
    findByIdWithCategories: vi.fn(async () => view()),
    ...overrides,
  };
}

function fakeLocations(exists = true): LocationReader {
  return { existsActive: vi.fn(async () => exists) };
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

function fakeEvents(): VendorProfileEventLogger & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    emitProfileCreated: () => undefined,
    emitProfileUpdated: (v, ctx) => {
      calls.push({ event: 'updated', v, ctx });
    },
    emitProfileRepending: (v, ctx) => {
      calls.push({ event: 'repending', v, ctx });
    },
    emitProfileSoftDeleted: (ids, ctx) => {
      calls.push({ event: 'soft_deleted', ids, ctx });
    },
  };
}

/**
 * Fake mínimo de PrismaClient con `$transaction(async fn => fn(tx))`. El `tx` no se usa por los
 * fakes de repo/adminActions, así que un objeto vacío basta.
 */
function fakePrisma(): PrismaClient {
  return {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({} as unknown),
  } as unknown as PrismaClient;
}

// ── DTO ──────────────────────────────────────────────────────────────────
describe('US-041 UpdateVendorProfileRequestSchema', () => {
  it('AC-07 / VR-05: rechaza campos extra (status/slug/categories/vendor_user_id)', () => {
    for (const extra of ['status', 'slug', 'categories', 'vendor_user_id', 'category_change_count']) {
      const result = UpdateVendorProfileRequestSchema.safeParse({ bio: 'x'.repeat(60), [extra]: 'x' });
      expect(result.success, `extra=${extra}`).toBe(false);
    }
  });

  it('VR-09 / NT-07: rechaza body vacío', () => {
    const result = UpdateVendorProfileRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('VR-01 / NT-09: rechaza bio fuera de 50-1000', () => {
    expect(UpdateVendorProfileRequestSchema.safeParse({ bio: 'short' }).success).toBe(false);
    expect(UpdateVendorProfileRequestSchema.safeParse({ bio: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('acepta body válido con solo bio (menor)', () => {
    const r = UpdateVendorProfileRequestSchema.safeParse({ bio: 'x'.repeat(60) });
    expect(r.success).toBe(true);
  });

  it('acepta body válido con business_name + languages_supported', () => {
    const r = UpdateVendorProfileRequestSchema.safeParse({
      business_name: 'Nueva',
      languages_supported: ['es-LATAM', 'en'],
    });
    expect(r.success).toBe(true);
  });

  it('rechaza language desconocido en catálogo', () => {
    const r = UpdateVendorProfileRequestSchema.safeParse({ languages_supported: ['fr'] });
    expect(r.success).toBe(false);
  });
});

describe('US-041 hasMajorField (D1)', () => {
  it('true cuando business_name está presente', () => {
    expect(hasMajorField({ business_name: 'x' })).toBe(true);
  });
  it('true cuando location_id está presente', () => {
    expect(hasMajorField({ location_id: '00000000-0000-0000-0000-000000000000' })).toBe(true);
  });
  it('false cuando solo hay campos menores', () => {
    expect(hasMajorField({ bio: 'x'.repeat(60) })).toBe(false);
    expect(hasMajorField({ languages_supported: ['es-LATAM'] })).toBe(false);
  });
});

// ── UpdateVendorProfileUseCase ───────────────────────────────────────────
describe('US-041 UpdateVendorProfileUseCase', () => {
  it('AC-01 menor desde approved: no transiciona, no persiste AdminAction, no emite repending', async () => {
    const repo = fakeRepo();
    const admin = fakeAdminActions();
    const events = fakeEvents();
    const uc = new UpdateVendorProfileUseCase(repo, fakeLocations(true), admin, clock, events, fakePrisma());

    const result = await uc.execute({
      vendorUserId: USER_ID,
      body: { bio: 'x'.repeat(60) },
    });

    expect(result.repending).toBe(false);
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(admin.create).not.toHaveBeenCalled();
    const repending = events.calls.find((c) => (c as { event: string }).event === 'repending');
    expect(repending).toBeUndefined();
  });

  it('AC-02 mayor desde approved: transiciona a pending + persiste AdminAction + emite repending', async () => {
    const repo = fakeRepo();
    const admin = fakeAdminActions();
    const events = fakeEvents();
    const uc = new UpdateVendorProfileUseCase(repo, fakeLocations(true), admin, clock, events, fakePrisma());

    const result = await uc.execute(
      { vendorUserId: USER_ID, body: { business_name: 'Nueva Marca' } },
      { correlationId: 'corr-1' },
    );

    expect(result.repending).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith(PROFILE_ID, 'pending', expect.anything());
    expect(admin.create).toHaveBeenCalledTimes(1);
    expect(admin.calls[0]).toMatchObject({
      action: 'vendor_pending_after_major_edit',
      actorUserId: USER_ID,
      actorRole: 'vendor',
      correlationId: 'corr-1',
    });
    const repending = events.calls.find((c) => (c as { event: string }).event === 'repending');
    expect(repending).toBeDefined();
  });

  it('AC-03 mayor desde pending: aplica cambios pero no transiciona ni persiste AdminAction', async () => {
    const repo = fakeRepo({ findEditableByVendorUserId: vi.fn(async () => snapshot({ status: 'pending' })) });
    const admin = fakeAdminActions();
    const events = fakeEvents();
    const uc = new UpdateVendorProfileUseCase(repo, fakeLocations(true), admin, clock, events, fakePrisma());

    const result = await uc.execute({ vendorUserId: USER_ID, body: { business_name: 'Nueva' } });

    expect(result.repending).toBe(false);
    expect(repo.updateStatus).not.toHaveBeenCalled();
    expect(admin.create).not.toHaveBeenCalled();
  });

  it('AC-04 EC-03 status=rejected: lanza VendorProfileRejectedError', async () => {
    const repo = fakeRepo({ findEditableByVendorUserId: vi.fn(async () => snapshot({ status: 'rejected' })) });
    const uc = new UpdateVendorProfileUseCase(
      repo,
      fakeLocations(true),
      fakeAdminActions(),
      clock,
      fakeEvents(),
      fakePrisma(),
    );
    await expect(uc.execute({ vendorUserId: USER_ID, body: { bio: 'x'.repeat(60) } })).rejects.toBeInstanceOf(
      VendorProfileRejectedError,
    );
  });

  it('AC-04 EC-04 status=hidden: lanza VendorProfileHiddenError', async () => {
    const repo = fakeRepo({ findEditableByVendorUserId: vi.fn(async () => snapshot({ status: 'hidden' })) });
    const uc = new UpdateVendorProfileUseCase(
      repo,
      fakeLocations(true),
      fakeAdminActions(),
      clock,
      fakeEvents(),
      fakePrisma(),
    );
    await expect(uc.execute({ vendorUserId: USER_ID, body: { bio: 'x'.repeat(60) } })).rejects.toBeInstanceOf(
      VendorProfileHiddenError,
    );
  });

  it('NT-10 sin perfil: lanza VendorProfileNotFoundError', async () => {
    const repo = fakeRepo({ findEditableByVendorUserId: vi.fn(async () => null) });
    const uc = new UpdateVendorProfileUseCase(
      repo,
      fakeLocations(true),
      fakeAdminActions(),
      clock,
      fakeEvents(),
      fakePrisma(),
    );
    await expect(uc.execute({ vendorUserId: USER_ID, body: { bio: 'x'.repeat(60) } })).rejects.toBeInstanceOf(
      VendorProfileNotFoundError,
    );
  });

  it('EC-07 location inactiva: lanza ValidationError con field location_id', async () => {
    const uc = new UpdateVendorProfileUseCase(
      fakeRepo(),
      fakeLocations(false),
      fakeAdminActions(),
      clock,
      fakeEvents(),
      fakePrisma(),
    );
    await expect(
      uc.execute({ vendorUserId: USER_ID, body: { location_id: LOCATION_ID } }),
    ).rejects.toMatchObject({
      name: 'ValidationError',
      details: expect.arrayContaining([expect.objectContaining({ field: 'location_id' })]),
    });
  });

  it('EC-06 mayor + menor combinados desde approved: transiciona (AC-02) y aplica ambos', async () => {
    const repo = fakeRepo();
    const admin = fakeAdminActions();
    const events = fakeEvents();
    const uc = new UpdateVendorProfileUseCase(repo, fakeLocations(true), admin, clock, events, fakePrisma());

    const result = await uc.execute({
      vendorUserId: USER_ID,
      body: { business_name: 'X', bio: 'y'.repeat(60) },
    });
    expect(result.repending).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      PROFILE_ID,
      expect.objectContaining({ businessName: 'X', bio: expect.any(String) }),
      expect.anything(),
    );
  });
});

// ── SoftDeleteVendorProfileUseCase ───────────────────────────────────────
describe('US-041 SoftDeleteVendorProfileUseCase', () => {
  it('AC-05 happy path: soft-deletea en approved y emite log', async () => {
    const repo = fakeRepo();
    const events = fakeEvents();
    const uc = new SoftDeleteVendorProfileUseCase(repo, events);

    await uc.execute({ vendorUserId: USER_ID });

    expect(repo.softDelete).toHaveBeenCalledWith(PROFILE_ID, USER_ID);
    expect(events.calls[0]).toMatchObject({ event: 'soft_deleted' });
  });

  it('NT-10 sin perfil: VendorProfileNotFoundError', async () => {
    const repo = fakeRepo({ findAnyByVendorUserId: vi.fn(async () => null) });
    const uc = new SoftDeleteVendorProfileUseCase(repo, fakeEvents());
    await expect(uc.execute({ vendorUserId: USER_ID })).rejects.toBeInstanceOf(VendorProfileNotFoundError);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('EC-05 perfil ya soft-deleted: VendorProfileAlreadyDeletedError', async () => {
    const repo = fakeRepo({
      findAnyByVendorUserId: vi.fn(async () => snapshot({ deletedAt: new Date('2026-01-01') })),
    });
    const uc = new SoftDeleteVendorProfileUseCase(repo, fakeEvents());
    await expect(uc.execute({ vendorUserId: USER_ID })).rejects.toBeInstanceOf(VendorProfileAlreadyDeletedError);
  });

  it('EC-04 status=hidden: VendorProfileHiddenError', async () => {
    const repo = fakeRepo({
      findAnyByVendorUserId: vi.fn(async () => snapshot({ status: 'hidden' })),
    });
    const uc = new SoftDeleteVendorProfileUseCase(repo, fakeEvents());
    await expect(uc.execute({ vendorUserId: USER_ID })).rejects.toBeInstanceOf(VendorProfileHiddenError);
  });

  it('AC-05 permite DELETE en rejected', async () => {
    const repo = fakeRepo({
      findAnyByVendorUserId: vi.fn(async () => snapshot({ status: 'rejected' })),
    });
    const uc = new SoftDeleteVendorProfileUseCase(repo, fakeEvents());
    await expect(uc.execute({ vendorUserId: USER_ID })).resolves.toBeUndefined();
    expect(repo.softDelete).toHaveBeenCalled();
  });
});
