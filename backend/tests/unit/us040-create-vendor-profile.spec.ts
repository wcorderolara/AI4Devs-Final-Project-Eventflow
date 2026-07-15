// US-040 (PB-P1-024 / QA-001) — Unit tests del use case CreateVendorProfileUseCase.
// DB-free: fakes de repo/readers/logger. Cobertura de AC-01, AC-03/EC-01..07, VR-02..09.
import { describe, it, expect, vi } from 'vitest';
import { CreateVendorProfileUseCase } from '../../src/modules/vendor-management/application/create-vendor-profile.use-case.js';
import {
  ProfileAlreadyExistsError,
  SlugConflictError,
  type LocationReader,
  type ServiceCategoryLookup,
  type VendorProfileRepository,
} from '../../src/modules/vendor-management/ports/vendor-profile.repository.js';
import { VendorProfileAlreadyExistsError } from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import type { VendorProfileEventLogger } from '../../src/modules/vendor-management/application/vendor-profile-event-logger.js';
import type { VendorProfileView } from '../../src/modules/vendor-management/domain/vendor-profile.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const USER_ID = '00000000-0000-0000-0000-0000000000a1';
const LOCATION_ID = '00000000-0000-0000-0000-0000000000c1';
const CATEGORY_A = '00000000-0000-0000-0000-000000000ca1';
const CATEGORY_B = '00000000-0000-0000-0000-000000000ca2';

const clock: ClockPort = { now: () => NOW };

const validCommand = {
  vendorUserId: USER_ID,
  businessName: 'Acme Catering',
  bio: 'Catering boutique con más de 10 años de experiencia en eventos corporativos y bodas en LATAM.',
  locationId: LOCATION_ID,
  languagesSupported: ['es-LATAM', 'en'] as ('es-LATAM' | 'en')[],
  categoryIds: [CATEGORY_A, CATEGORY_B],
};

function fakeRepo(overrides: Partial<VendorProfileRepository> = {}): VendorProfileRepository {
  return {
    existsForUser: vi.fn(async () => false),
    findSlugsStartingWith: vi.fn(async () => []),
    create: vi.fn(async (input) => makeView({ slug: input.slug, categoryIds: input.categoryIds })),
    ...overrides,
  };
}

function fakeLocationReader(exists = true): LocationReader {
  return { existsActive: vi.fn(async () => exists) };
}

function fakeCategoryLookup(activeIds: string[]): ServiceCategoryLookup {
  return {
    findActiveIds: vi.fn(async () =>
      activeIds.map((id) => ({ id, name: `cat-${id.slice(-4)}` })),
    ),
  };
}

function fakeLogger(): VendorProfileEventLogger & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    emitProfileCreated: (view, ctx) => {
      calls.push({ view, ctx });
    },
  };
}

function makeView(
  partial: { slug?: string; categoryIds?: string[] } = {},
): VendorProfileView {
  const categoryIds = partial.categoryIds ?? [CATEGORY_A, CATEGORY_B];
  return {
    id: '00000000-0000-0000-0000-0000000000v1',
    vendorUserId: USER_ID,
    businessName: validCommand.businessName,
    bio: validCommand.bio,
    locationId: LOCATION_ID,
    languagesSupported: ['es-LATAM', 'en'],
    categories: categoryIds.map((id) => ({ id, name: `cat-${id.slice(-4)}` })),
    slug: partial.slug ?? 'acme-catering',
    status: 'pending',
    createdAt: NOW,
  };
}

describe('US-040 CreateVendorProfileUseCase', () => {
  it('AC-01 happy path: crea perfil, resuelve categorías activas y emite log', async () => {
    const repo = fakeRepo();
    const logger = fakeLogger();
    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      logger,
    );

    const view = await uc.execute(validCommand, { correlationId: 'corr-1' });

    expect(view.status).toBe('pending');
    expect(view.slug).toBe('acme-catering');
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ vendorUserId: USER_ID, slug: 'acme-catering' }),
    );
    expect(logger.calls).toHaveLength(1);
  });

  it('AC-03 EC-04 desambigua slug cuando existen colisiones previas', async () => {
    const repo = fakeRepo({
      findSlugsStartingWith: vi.fn(async () => ['acme-catering', 'acme-catering-2']),
    });
    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      fakeLogger(),
    );

    await uc.execute(validCommand);

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'acme-catering-3' }));
  });

  it('AC-03 retry: si UNIQUE(slug) explota concurrente, reintenta con el siguiente', async () => {
    const createMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new SlugConflictError('acme-catering');
      })
      .mockImplementationOnce(async (input) => makeView({ slug: input.slug }));
    const findSlugsMock = vi
      .fn()
      .mockImplementationOnce(async () => [])
      .mockImplementationOnce(async () => ['acme-catering']);
    const repo = fakeRepo({ create: createMock, findSlugsStartingWith: findSlugsMock });

    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      fakeLogger(),
    );

    const view = await uc.execute(validCommand);

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(view.slug).toBe('acme-catering-2');
  });

  it('EC-01: si el vendor ya tiene perfil, lanza VendorProfileAlreadyExistsError', async () => {
    const repo = fakeRepo({ existsForUser: vi.fn(async () => true) });
    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      fakeLogger(),
    );

    await expect(uc.execute(validCommand)).rejects.toBeInstanceOf(VendorProfileAlreadyExistsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('EC-01: si Prisma explota P2002 sobre user_id en la escritura, lo traduce a PROFILE_EXISTS', async () => {
    const repo = fakeRepo({
      create: vi.fn(async () => {
        throw new ProfileAlreadyExistsError();
      }),
    });
    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      fakeLogger(),
    );

    await expect(uc.execute(validCommand)).rejects.toBeInstanceOf(VendorProfileAlreadyExistsError);
  });

  it('EC-03: location inexistente → ValidationError con field location_id', async () => {
    const uc = new CreateVendorProfileUseCase(
      fakeRepo(),
      fakeLocationReader(false),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      clock,
      fakeLogger(),
    );

    await expect(uc.execute(validCommand)).rejects.toMatchObject({
      name: 'ValidationError',
      details: expect.arrayContaining([expect.objectContaining({ field: 'location_id' })]),
    });
  });

  it('EC-02: categoría inactiva → ValidationError con lista invalid_categories', async () => {
    // Solo la primera categoría está activa.
    const uc = new CreateVendorProfileUseCase(
      fakeRepo(),
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A]),
      clock,
      fakeLogger(),
    );

    await expect(uc.execute(validCommand)).rejects.toMatchObject({
      name: 'ValidationError',
      details: expect.arrayContaining([
        expect.objectContaining({ field: 'invalid_categories', message: CATEGORY_B }),
      ]),
    });
  });

  it('deduplica categoryIds repetidos preservando orden', async () => {
    const repo = fakeRepo();
    const uc = new CreateVendorProfileUseCase(
      repo,
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A]),
      clock,
      fakeLogger(),
    );
    await uc.execute({ ...validCommand, categoryIds: [CATEGORY_A, CATEGORY_A, CATEGORY_A] });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryIds: [CATEGORY_A] }),
    );
  });

  it('el log incluye correlationId y duración medida contra el clock', async () => {
    let calls = 0;
    const advancingClock: ClockPort = {
      now: () => new Date(NOW.getTime() + (calls++ === 0 ? 0 : 15)),
    };
    const logger = fakeLogger();
    const uc = new CreateVendorProfileUseCase(
      fakeRepo(),
      fakeLocationReader(true),
      fakeCategoryLookup([CATEGORY_A, CATEGORY_B]),
      advancingClock,
      logger,
    );

    await uc.execute(validCommand, { correlationId: 'corr-42' });

    expect(logger.calls[0]).toMatchObject({
      ctx: { correlationId: 'corr-42', durationMs: 15 },
    });
  });
});

describe('US-040 DTO strictness (VR-07)', () => {
  it('el schema Zod rechaza campos no permitidos', async () => {
    const { CreateVendorProfileRequestSchema } = await import(
      '../../src/modules/vendor-management/interface/dto/create-vendor-profile.request.js'
    );
    const result = CreateVendorProfileRequestSchema.safeParse({
      business_name: 'Acme',
      bio: 'x'.repeat(60),
      location_id: LOCATION_ID,
      languages_supported: ['es-LATAM'],
      categories: [CATEGORY_A],
      status: 'approved', // extra
    });
    expect(result.success).toBe(false);
  });

  it('acepta el body canónico de AC-01', async () => {
    const { CreateVendorProfileRequestSchema } = await import(
      '../../src/modules/vendor-management/interface/dto/create-vendor-profile.request.js'
    );
    const result = CreateVendorProfileRequestSchema.safeParse({
      business_name: 'Acme Catering',
      bio: 'x'.repeat(60),
      location_id: LOCATION_ID,
      languages_supported: ['es-LATAM', 'en'],
      categories: [CATEGORY_A, CATEGORY_B],
    });
    expect(result.success).toBe(true);
  });

  it('rechaza bio < 50 o > 1000 (VR-02, D4)', async () => {
    const { CreateVendorProfileRequestSchema } = await import(
      '../../src/modules/vendor-management/interface/dto/create-vendor-profile.request.js'
    );
    const base = {
      business_name: 'Acme',
      location_id: LOCATION_ID,
      languages_supported: ['es-LATAM'] as const,
      categories: [CATEGORY_A],
    };
    expect(CreateVendorProfileRequestSchema.safeParse({ ...base, bio: 'short' }).success).toBe(false);
    expect(
      CreateVendorProfileRequestSchema.safeParse({ ...base, bio: 'x'.repeat(1001) }).success,
    ).toBe(false);
  });

  it('rechaza categories fuera de rango 1..3 (VR-03, D2)', async () => {
    const { CreateVendorProfileRequestSchema } = await import(
      '../../src/modules/vendor-management/interface/dto/create-vendor-profile.request.js'
    );
    const base = {
      business_name: 'Acme',
      bio: 'x'.repeat(60),
      location_id: LOCATION_ID,
      languages_supported: ['es-LATAM'] as const,
    };
    expect(CreateVendorProfileRequestSchema.safeParse({ ...base, categories: [] }).success).toBe(false);
    expect(
      CreateVendorProfileRequestSchema.safeParse({
        ...base,
        categories: [CATEGORY_A, CATEGORY_B, CATEGORY_A, CATEGORY_B],
      }).success,
    ).toBe(false);
  });

  it('rechaza languages_supported vacío o con códigos desconocidos (VR-05, EC-05)', async () => {
    const { CreateVendorProfileRequestSchema } = await import(
      '../../src/modules/vendor-management/interface/dto/create-vendor-profile.request.js'
    );
    const base = {
      business_name: 'Acme',
      bio: 'x'.repeat(60),
      location_id: LOCATION_ID,
      categories: [CATEGORY_A],
    };
    expect(
      CreateVendorProfileRequestSchema.safeParse({ ...base, languages_supported: [] }).success,
    ).toBe(false);
    expect(
      CreateVendorProfileRequestSchema.safeParse({ ...base, languages_supported: ['fr'] }).success,
    ).toBe(false);
  });
});

// Evita warnings TS de imports no usados en algunas configuraciones.
void ValidationError;
