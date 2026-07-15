// US-044 (PB-P1-027 / QA-001) — Unit tests para:
//  - DTOs `CreateVendorServiceRequestSchema` y `UpdateVendorServiceRequestSchema`.
//  - Los 4 use cases (Create, Update, Deactivate, List).
//  - Rama de idempotencia AC-01c/EC-09 y política D1 (hidden / soft-deleted).
import { describe, expect, it, vi } from 'vitest';
import { CreateVendorServiceRequestSchema } from '../../src/modules/vendor-management/interface/dto/create-vendor-service.request.js';
import { UpdateVendorServiceRequestSchema } from '../../src/modules/vendor-management/interface/dto/update-vendor-service.request.js';
import { CreateVendorServiceUseCase } from '../../src/modules/vendor-management/application/create-vendor-service.use-case.js';
import { UpdateVendorServiceUseCase } from '../../src/modules/vendor-management/application/update-vendor-service.use-case.js';
import { DeactivateVendorServiceUseCase } from '../../src/modules/vendor-management/application/deactivate-vendor-service.use-case.js';
import { ListVendorServicesUseCase } from '../../src/modules/vendor-management/application/list-vendor-services.use-case.js';
import type {
  ServiceCategoryLookup,
  VendorProfileEditableSnapshot,
  VendorProfileRepository,
} from '../../src/modules/vendor-management/ports/vendor-profile.repository.js';
import type {
  VendorServiceRepository,
} from '../../src/modules/vendor-management/ports/vendor-service.repository.js';
import type { VendorServiceEventLogger } from '../../src/modules/vendor-management/application/vendor-service-event-logger.js';
import type { VendorServiceView } from '../../src/modules/vendor-management/domain/vendor-service.js';
import type { ClockPort } from '../../src/shared/domain/clock.port.js';
import { InvalidCategoryError } from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import {
  VendorProfileHiddenError,
  VendorProfileNotFoundError,
} from '../../src/modules/vendor-management/domain/vendor-profile.errors.js';
import {
  VendorServiceLimitReachedError,
  VendorServiceNotFoundError,
} from '../../src/modules/vendor-management/domain/vendor-service.errors.js';

const NOW = new Date('2026-07-15T12:00:00Z');
const clock: ClockPort = { now: () => NOW };
const USER_ID = '00000000-0000-0000-0000-0000000000a1';
const PROFILE_ID = '00000000-0000-0000-0000-0000000000v1';
const CATEGORY_ID = '00000000-0000-0000-0000-0000000000c1';
const SERVICE_ID = '00000000-0000-0000-0000-0000000000s1';

function editableSnapshot(
  overrides: Partial<VendorProfileEditableSnapshot> = {},
): VendorProfileEditableSnapshot {
  return {
    id: PROFILE_ID,
    vendorUserId: USER_ID,
    status: 'approved',
    deletedAt: null,
    ...overrides,
  };
}

function fakeProfileRepo(snapshot: VendorProfileEditableSnapshot | null): VendorProfileRepository {
  return {
    existsForUser: vi.fn(),
    findSlugsStartingWith: vi.fn(),
    create: vi.fn(),
    findEditableByVendorUserId: vi.fn().mockResolvedValue(snapshot),
    findAnyByVendorUserId: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
    findByIdWithCategories: vi.fn(),
    findActiveWithCategoriesByVendorUserId: vi.fn(),
    lockAndRereadForCategoryChange: vi.fn(),
    replaceCategoriesAndAdvanceCounter: vi.fn(),
  } as unknown as VendorProfileRepository;
}

function fakeServiceRepo(overrides: Partial<VendorServiceRepository> = {}): VendorServiceRepository {
  return {
    countActiveByVendorProfileId: vi.fn().mockResolvedValue(0),
    findAllByVendorProfileId: vi.fn().mockResolvedValue([]),
    findOwnedById: vi.fn().mockResolvedValue(null),
    existsOwnedById: vi.fn().mockResolvedValue(false),
    create: vi.fn(),
    update: vi.fn(),
    softDeactivate: vi.fn(),
    ...overrides,
  };
}

function fakeCategories(active = true): ServiceCategoryLookup {
  return {
    findActiveIds: vi.fn(),
    findByIds: vi.fn().mockResolvedValue([{ id: CATEGORY_ID, isActive: active }]),
  };
}

function fakeEvents(): VendorServiceEventLogger {
  return {
    emitCreated: vi.fn(),
    emitUpdated: vi.fn(),
    emitDeactivated: vi.fn(),
  };
}

function serviceView(overrides: Partial<VendorServiceView> = {}): VendorServiceView {
  return {
    id: SERVICE_ID,
    vendorProfileId: PROFILE_ID,
    serviceCategoryId: CATEGORY_ID,
    packageName: 'Paquete Boda',
    description: 'Descripción demo de al menos 10 caracteres.',
    basePrice: '1500.00',
    currencyCode: 'GTQ',
    isActive: true,
    aiGeneratedDescription: false,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe('US-044 — DTO create', () => {
  it('parsea un body válido', () => {
    const result = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'Paquete Boda Premium',
      description: 'Descripción demo con longitud suficiente para pasar el mínimo.',
      base_price: '1500.00',
      currency_code: 'GTQ',
      service_category_id: CATEGORY_ID,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza package_name corto', () => {
    const r = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'a',
      description: 'x'.repeat(20),
      base_price: '1.00',
      currency_code: 'GTQ',
      service_category_id: CATEGORY_ID,
    });
    expect(r.success).toBe(false);
  });

  it('rechaza description fuera de rango', () => {
    const r = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'Paquete',
      description: 'corto',
      base_price: '1.00',
      currency_code: 'GTQ',
      service_category_id: CATEGORY_ID,
    });
    expect(r.success).toBe(false);
  });

  it('rechaza base_price no decimal', () => {
    const r = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'Paquete',
      description: 'x'.repeat(20),
      base_price: '-5',
      currency_code: 'GTQ',
      service_category_id: CATEGORY_ID,
    });
    expect(r.success).toBe(false);
  });

  it('rechaza currency fuera del enum', () => {
    const r = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'Paquete',
      description: 'x'.repeat(20),
      base_price: '1.00',
      currency_code: 'JPY',
      service_category_id: CATEGORY_ID,
    });
    expect(r.success).toBe(false);
  });

  it('rechaza extras (strict)', () => {
    const r = CreateVendorServiceRequestSchema.safeParse({
      package_name: 'Paquete',
      description: 'x'.repeat(20),
      base_price: '1.00',
      currency_code: 'GTQ',
      service_category_id: CATEGORY_ID,
      is_active: true,
    } as never);
    expect(r.success).toBe(false);
  });
});

describe('US-044 — DTO update', () => {
  it('acepta body con un solo campo', () => {
    const r = UpdateVendorServiceRequestSchema.safeParse({ package_name: 'Nuevo' });
    expect(r.success).toBe(true);
  });

  it('rechaza body vacío', () => {
    const r = UpdateVendorServiceRequestSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('acepta is_active para reactivación', () => {
    const r = UpdateVendorServiceRequestSchema.safeParse({ is_active: true });
    expect(r.success).toBe(true);
  });

  it('rechaza extras', () => {
    const r = UpdateVendorServiceRequestSchema.safeParse({ foo: 'bar' } as never);
    expect(r.success).toBe(false);
  });
});

describe('US-044 — CreateVendorServiceUseCase', () => {
  it('AC-01a crea servicio y emite log', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      countActiveByVendorProfileId: vi.fn().mockResolvedValue(3),
      create: vi.fn().mockResolvedValue(serviceView()),
    });
    const events = fakeEvents();
    const uc = new CreateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, events);

    const result = await uc.execute({
      vendorUserId: USER_ID,
      body: {
        package_name: 'Paquete Boda',
        description: 'Descripción demo con longitud suficiente.',
        base_price: '1500.00',
        currency_code: 'GTQ',
        service_category_id: CATEGORY_ID,
      },
    });
    expect(result.service.id).toBe(SERVICE_ID);
    expect(result.activeCountAfter).toBe(4);
    expect(events.emitCreated).toHaveBeenCalledTimes(1);
  });

  it('EC-04 rechaza al alcanzar cap 50', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      countActiveByVendorProfileId: vi.fn().mockResolvedValue(50),
      create: vi.fn(),
    });
    const uc = new CreateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, fakeEvents());
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        body: {
          package_name: 'x',
          description: 'x'.repeat(20),
          base_price: '1.00',
          currency_code: 'GTQ',
          service_category_id: CATEGORY_ID,
        },
      }),
    ).rejects.toBeInstanceOf(VendorServiceLimitReachedError);
    expect(serviceRepo.create).not.toHaveBeenCalled();
  });

  it('EC-02 rechaza categoría inactiva', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const uc = new CreateVendorServiceUseCase(
      profileRepo,
      fakeServiceRepo(),
      fakeCategories(false),
      clock,
      fakeEvents(),
    );
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        body: {
          package_name: 'x',
          description: 'x'.repeat(20),
          base_price: '1.00',
          currency_code: 'GTQ',
          service_category_id: CATEGORY_ID,
        },
      }),
    ).rejects.toBeInstanceOf(InvalidCategoryError);
  });

  it('EC-06 rechaza vendor hidden', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot({ status: 'hidden' }));
    const uc = new CreateVendorServiceUseCase(
      profileRepo,
      fakeServiceRepo(),
      fakeCategories(),
      clock,
      fakeEvents(),
    );
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        body: {
          package_name: 'x',
          description: 'x'.repeat(20),
          base_price: '1.00',
          currency_code: 'GTQ',
          service_category_id: CATEGORY_ID,
        },
      }),
    ).rejects.toBeInstanceOf(VendorProfileHiddenError);
  });

  it('EC-07 rechaza vendor sin perfil (soft-deleted)', async () => {
    const profileRepo = fakeProfileRepo(null);
    const uc = new CreateVendorServiceUseCase(
      profileRepo,
      fakeServiceRepo(),
      fakeCategories(),
      clock,
      fakeEvents(),
    );
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        body: {
          package_name: 'x',
          description: 'x'.repeat(20),
          base_price: '1.00',
          currency_code: 'GTQ',
          service_category_id: CATEGORY_ID,
        },
      }),
    ).rejects.toBeInstanceOf(VendorProfileNotFoundError);
  });
});

describe('US-044 — UpdateVendorServiceUseCase', () => {
  it('AC-01b actualiza campos y emite log', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      findOwnedById: vi.fn().mockResolvedValue({
        id: SERVICE_ID,
        vendorProfileId: PROFILE_ID,
        isActive: true,
      }),
      update: vi.fn().mockResolvedValue(serviceView({ packageName: 'Nuevo' })),
    });
    const events = fakeEvents();
    const uc = new UpdateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, events);
    const result = await uc.execute({
      vendorUserId: USER_ID,
      serviceId: SERVICE_ID,
      body: { package_name: 'Nuevo' },
    });
    expect(result.reactivated).toBe(false);
    expect(result.service.packageName).toBe('Nuevo');
    expect(events.emitUpdated).toHaveBeenCalledTimes(1);
  });

  it('EC-08 servicio ajeno → 404', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      findOwnedById: vi.fn().mockResolvedValue(null),
    });
    const uc = new UpdateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, fakeEvents());
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        serviceId: SERVICE_ID,
        body: { package_name: 'x' },
      }),
    ).rejects.toBeInstanceOf(VendorServiceNotFoundError);
  });

  it('EC-04 reactivar con tope alcanzado → 409', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      findOwnedById: vi.fn().mockResolvedValue({
        id: SERVICE_ID,
        vendorProfileId: PROFILE_ID,
        isActive: false,
      }),
      countActiveByVendorProfileId: vi.fn().mockResolvedValue(50),
    });
    const uc = new UpdateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, fakeEvents());
    await expect(
      uc.execute({
        vendorUserId: USER_ID,
        serviceId: SERVICE_ID,
        body: { is_active: true },
      }),
    ).rejects.toBeInstanceOf(VendorServiceLimitReachedError);
  });

  it('reactiva cuando queda cupo — marca reactivated=true', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      findOwnedById: vi.fn().mockResolvedValue({
        id: SERVICE_ID,
        vendorProfileId: PROFILE_ID,
        isActive: false,
      }),
      countActiveByVendorProfileId: vi.fn().mockResolvedValue(10),
      update: vi.fn().mockResolvedValue(serviceView({ isActive: true })),
    });
    const events = fakeEvents();
    const uc = new UpdateVendorServiceUseCase(profileRepo, serviceRepo, fakeCategories(), clock, events);
    const result = await uc.execute({
      vendorUserId: USER_ID,
      serviceId: SERVICE_ID,
      body: { is_active: true },
    });
    expect(result.reactivated).toBe(true);
    expect(events.emitUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ reactivated: true, fieldsUpdated: ['is_active'] }),
    );
  });
});

describe('US-044 — DeactivateVendorServiceUseCase', () => {
  it('AC-01c transición real emite log', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      softDeactivate: vi.fn().mockResolvedValue({ transitioned: true }),
    });
    const events = fakeEvents();
    const uc = new DeactivateVendorServiceUseCase(profileRepo, serviceRepo, clock, events);
    const r = await uc.execute({ vendorUserId: USER_ID, serviceId: SERVICE_ID });
    expect(r.transitioned).toBe(true);
    expect(events.emitDeactivated).toHaveBeenCalledTimes(1);
  });

  it('EC-09 idempotencia — ya inactivo → 204 sin log', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      softDeactivate: vi.fn().mockResolvedValue({ transitioned: false }),
    });
    const events = fakeEvents();
    const uc = new DeactivateVendorServiceUseCase(profileRepo, serviceRepo, clock, events);
    const r = await uc.execute({ vendorUserId: USER_ID, serviceId: SERVICE_ID });
    expect(r.transitioned).toBe(false);
    expect(events.emitDeactivated).not.toHaveBeenCalled();
  });

  it('EC-08 servicio ajeno → 404 SERVICE_NOT_FOUND', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const serviceRepo = fakeServiceRepo({
      softDeactivate: vi.fn().mockResolvedValue(null),
    });
    const uc = new DeactivateVendorServiceUseCase(profileRepo, serviceRepo, clock, fakeEvents());
    await expect(
      uc.execute({ vendorUserId: USER_ID, serviceId: SERVICE_ID }),
    ).rejects.toBeInstanceOf(VendorServiceNotFoundError);
  });
});

describe('US-044 — ListVendorServicesUseCase', () => {
  it('AC-01d retorna items del vendor', async () => {
    const profileRepo = fakeProfileRepo(editableSnapshot());
    const items = [serviceView(), serviceView({ id: '00000000-0000-0000-0000-0000000000s2' })];
    const serviceRepo = fakeServiceRepo({
      findAllByVendorProfileId: vi.fn().mockResolvedValue(items),
    });
    const uc = new ListVendorServicesUseCase(profileRepo, serviceRepo);
    const r = await uc.execute({ vendorUserId: USER_ID });
    expect(r.items).toHaveLength(2);
  });
});
