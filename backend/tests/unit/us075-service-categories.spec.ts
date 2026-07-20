// US-075 (PB-P1-042 / QA-001) — Unit tests para el CRUD admin de `ServiceCategory`.
//
// Cobertura:
//   DTOs (`Create/Update/DeleteServiceCategoryBodySchema` + `ServiceCategoryIdParamsSchema`):
//     - shape strict (rechaza campos ajenos);
//     - `code` slug `^[a-z0-9-]+$`, [1..64];
//     - `sort_order` int >= 0;
//     - `parent_id` UUID válido o `null`;
//     - `name_i18n` acepta record<string,string>;
//     - update requiere al menos un campo (refine).
//
//   UseCases (branches de negocio con `code` estable):
//     - Create: AC-01 root feliz, AC-02 child feliz, EC-01 hijo-de-hijo → INVALID_HIERARCHY_DEPTH,
//       EC-05 name_i18n sin es-LATAM → INVALID_NAME_I18N, EC-06 code duplicado → DUPLICATE_CODE,
//       AC parent inexistente → INVALID_PARENT_ID, AdminAction chain, log service_category.created.
//     - Update: AC-03 patch nombre + is_active, reactivate detection (false→true), EC-02 mover
//       root con children → INVALID_HIERARCHY_DEPTH, mover a nivel 3 → INVALID_HIERARCHY_DEPTH,
//       404 SERVICE_CATEGORY_NOT_FOUND cuando no existe / soft-deleted.
//     - SoftDelete: AC-04 feliz, EC-03 con vendor_services → CATEGORY_IN_USE con usage_count,
//       EC-04 con children activos → CATEGORY_HAS_CHILDREN, 404 uniforme.
//     - List: shape {tree, flat}, filtro is_active para variante pública.
import { describe, expect, it, vi } from 'vitest';
import type { Prisma as PrismaTypes } from '@prisma/client';
import {
  CreateServiceCategoryBodySchema,
  DeleteServiceCategoryBodySchema,
  ServiceCategoryIdParamsSchema,
  UpdateServiceCategoryBodySchema,
} from '../../src/modules/service-catalog/interface/service-category.dto.js';
import { CreateServiceCategoryUseCase } from '../../src/modules/service-catalog/application/create-service-category.use-case.js';
import { UpdateServiceCategoryUseCase } from '../../src/modules/service-catalog/application/update-service-category.use-case.js';
import { SoftDeleteServiceCategoryUseCase } from '../../src/modules/service-catalog/application/soft-delete-service-category.use-case.js';
import { ListServiceCategoriesUseCase } from '../../src/modules/service-catalog/application/list-service-categories.use-case.js';
import {
  CategoryHasChildrenError,
  CategoryInUseError,
  DuplicateCategoryCodeError,
  InvalidHierarchyDepthError,
  InvalidNameI18nError,
  InvalidParentIdError,
  ServiceCategoryNotFoundError,
} from '../../src/modules/service-catalog/domain/us075.errors.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';

const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const ROOT_ID = '11111111-1111-4111-8111-111111111111';
const CHILD_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ROOT_ID = '33333333-3333-4333-8333-333333333333';
const AA_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const NOW = new Date('2026-07-20T12:00:00Z');

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ROOT_ID,
    code: 'music',
    label: 'Música',
    description: null,
    nameI18n: { 'es-LATAM': 'Música' },
    descriptionI18n: null,
    parentId: null,
    sortOrder: 0,
    depthLevel: 1,
    isActive: true,
    isSeed: false,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

describe('US-075 · DTO CreateServiceCategoryBodySchema', () => {
  const goodName = { 'es-LATAM': 'Música' };
  it('acepta root feliz', () => {
    const p = CreateServiceCategoryBodySchema.safeParse({ code: 'music', name_i18n: goodName });
    expect(p.success).toBe(true);
  });
  it('acepta child feliz con parent_id UUID', () => {
    const p = CreateServiceCategoryBodySchema.safeParse({
      code: 'mariachi',
      name_i18n: goodName,
      parent_id: ROOT_ID,
      sort_order: 5,
    });
    expect(p.success).toBe(true);
  });
  it('rechaza code inválido (mayúsculas)', () => {
    expect(CreateServiceCategoryBodySchema.safeParse({ code: 'Music', name_i18n: goodName }).success).toBe(false);
  });
  it('rechaza sort_order negativo', () => {
    expect(
      CreateServiceCategoryBodySchema.safeParse({ code: 'music', name_i18n: goodName, sort_order: -1 }).success,
    ).toBe(false);
  });
  it('rechaza parent_id no-UUID', () => {
    expect(
      CreateServiceCategoryBodySchema.safeParse({ code: 'music', name_i18n: goodName, parent_id: 'nope' }).success,
    ).toBe(false);
  });
  it('.strict() rechaza campos ajenos', () => {
    expect(
      CreateServiceCategoryBodySchema.safeParse({ code: 'music', name_i18n: goodName, extra: 'x' }).success,
    ).toBe(false);
  });
});

describe('US-075 · DTO UpdateServiceCategoryBodySchema', () => {
  it('requiere al menos un campo (refine)', () => {
    expect(UpdateServiceCategoryBodySchema.safeParse({}).success).toBe(false);
  });
  it('acepta patch de is_active solo', () => {
    expect(UpdateServiceCategoryBodySchema.safeParse({ is_active: true }).success).toBe(true);
  });
  it('acepta patch parent_id null (mover a root)', () => {
    expect(UpdateServiceCategoryBodySchema.safeParse({ parent_id: null }).success).toBe(true);
  });
});

describe('US-075 · DTO DeleteServiceCategoryBodySchema', () => {
  it('acepta body con reason string', () => {
    expect(
      DeleteServiceCategoryBodySchema.safeParse({ reason: 'Ya no es utilizada en LATAM' }).success,
    ).toBe(true);
  });
  it('rechaza reason > 500', () => {
    expect(DeleteServiceCategoryBodySchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });
  it('.strict() rechaza campos ajenos', () => {
    expect(DeleteServiceCategoryBodySchema.safeParse({ reason: 'ok', extra: true }).success).toBe(false);
  });
});

describe('US-075 · ServiceCategoryIdParamsSchema', () => {
  it('acepta UUID válido', () => {
    expect(ServiceCategoryIdParamsSchema.safeParse({ id: ROOT_ID }).success).toBe(true);
  });
  it('rechaza id malformado', () => {
    expect(ServiceCategoryIdParamsSchema.safeParse({ id: 'nope' }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CreateServiceCategoryUseCase
// ─────────────────────────────────────────────────────────────────────────────

function buildCreate(opts: {
  parentRow?: Record<string, unknown> | null;
  duplicateCode?: boolean;
} = {}) {
  const parentFindSpy = vi.fn().mockResolvedValue(opts.parentRow ?? null);
  const dupFindSpy = vi.fn().mockResolvedValue(opts.duplicateCode ? { id: AA_ID } : null);
  const createSpy = vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) =>
    baseRow({ id: AA_ID, ...args.data }),
  );
  const adminCreateSpy = vi.fn().mockResolvedValue({ id: AA_ID });
  const logSpy = vi.fn();

  const tx = {
    serviceCategory: {
      findUnique: (args: { where: { id?: string; code?: string } }) => {
        if (args.where.id !== undefined) return parentFindSpy(args);
        if (args.where.code !== undefined) return dupFindSpy(args);
        return null;
      },
      create: createSpy,
    },
    adminAction: { create: adminCreateSpy },
  };
  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };
  const logger: DomainEventLogger = { emit: logSpy };
  const uc = new CreateServiceCategoryUseCase(logger, prismaMock as never);
  return { uc, parentFindSpy, dupFindSpy, createSpy, adminCreateSpy, logSpy };
}

describe('US-075 · CreateServiceCategoryUseCase', () => {
  const goodName = { 'es-LATAM': 'Música' };

  it('AC-01 crea root con AdminAction + log', async () => {
    const { uc, createSpy, adminCreateSpy, logSpy } = buildCreate();
    const view = await uc.execute(ADMIN_ID, { code: 'music', name_i18n: goodName, sort_order: 0 });
    expect(view.code).toBe('music');
    expect(view.parent_id).toBeNull();
    expect(view.depth_level).toBe(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const created = createSpy.mock.calls[0]![0]!.data;
    expect(created).toMatchObject({
      code: 'music',
      label: 'Música',
      nameI18n: goodName,
      depthLevel: 1,
      parentId: null,
      isActive: true,
    });
    expect(adminCreateSpy).toHaveBeenCalledTimes(1);
    const admin = adminCreateSpy.mock.calls[0]![0]!.data;
    expect(admin).toMatchObject({ action: 'create', targetEntity: 'service_category', targetId: view.id });
    expect(logSpy).toHaveBeenCalledWith(
      'service_category.created',
      expect.objectContaining({ code: 'music', parentId: null, adminActionId: AA_ID }),
    );
  });

  it('AC-02 crea child con depth_level=2', async () => {
    const { uc, createSpy } = buildCreate({ parentRow: { id: ROOT_ID, parentId: null } });
    const view = await uc.execute(ADMIN_ID, { code: 'mariachi', name_i18n: goodName, parent_id: ROOT_ID });
    expect(view.depth_level).toBe(2);
    expect(createSpy.mock.calls[0]![0]!.data.depthLevel).toBe(2);
  });

  it('EC-01 rechaza hijo-de-hijo (parent ya es child) con INVALID_HIERARCHY_DEPTH', async () => {
    const { uc } = buildCreate({ parentRow: { id: ROOT_ID, parentId: OTHER_ROOT_ID } });
    await expect(
      uc.execute(ADMIN_ID, { code: 'mariachi', name_i18n: goodName, parent_id: ROOT_ID }),
    ).rejects.toBeInstanceOf(InvalidHierarchyDepthError);
  });

  it('EC-05 name_i18n sin es-LATAM ⇒ INVALID_NAME_I18N', async () => {
    const { uc } = buildCreate();
    await expect(
      uc.execute(ADMIN_ID, { code: 'music', name_i18n: { en: 'Music' } }),
    ).rejects.toBeInstanceOf(InvalidNameI18nError);
  });

  it('EC-06 code duplicado ⇒ DUPLICATE_CODE', async () => {
    const { uc } = buildCreate({ duplicateCode: true });
    await expect(
      uc.execute(ADMIN_ID, { code: 'music', name_i18n: goodName }),
    ).rejects.toBeInstanceOf(DuplicateCategoryCodeError);
  });

  it('parent_id inexistente ⇒ INVALID_PARENT_ID', async () => {
    const { uc } = buildCreate({ parentRow: null });
    await expect(
      uc.execute(ADMIN_ID, { code: 'mariachi', name_i18n: goodName, parent_id: ROOT_ID }),
    ).rejects.toBeInstanceOf(InvalidParentIdError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UpdateServiceCategoryUseCase
// ─────────────────────────────────────────────────────────────────────────────

function buildUpdate(opts: {
  existing?: Record<string, unknown> | null;
  parentRow?: Record<string, unknown> | null;
  childrenCount?: number;
} = {}) {
  const existing = opts.existing === undefined
    ? { ...baseRow({ id: ROOT_ID }), _count: { children: opts.childrenCount ?? 0 } }
    : opts.existing;
  const findFirstSpy = vi.fn().mockResolvedValue(existing);
  const findParentSpy = vi.fn().mockResolvedValue(opts.parentRow ?? null);
  const updateSpy = vi.fn().mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
    baseRow({ id: args.where.id, ...args.data, parentId: args.data.parent === undefined ? (existing as { parentId?: string | null } | null)?.parentId ?? null : (args.data as { parent?: { connect?: { id: string }; disconnect?: boolean } }).parent?.connect?.id ?? null }),
  );
  const adminCreateSpy = vi.fn().mockResolvedValue({ id: AA_ID });
  const logSpy = vi.fn();

  const tx = {
    serviceCategory: {
      findFirst: findFirstSpy,
      findUnique: findParentSpy,
      update: updateSpy,
    },
    adminAction: { create: adminCreateSpy },
  };
  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };
  const uc = new UpdateServiceCategoryUseCase({ emit: logSpy }, prismaMock as never);
  return { uc, findFirstSpy, findParentSpy, updateSpy, adminCreateSpy, logSpy };
}

describe('US-075 · UpdateServiceCategoryUseCase', () => {
  it('AC-03 patch name + sort_order emite update', async () => {
    const { uc, updateSpy, adminCreateSpy } = buildUpdate();
    await uc.execute(ADMIN_ID, ROOT_ID, { name_i18n: { 'es-LATAM': 'Musica' }, sort_order: 5 });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(adminCreateSpy.mock.calls[0]![0]!.data.action).toBe('update');
  });

  it('reactivate cuando is_active pasa de false → true', async () => {
    const existing = { ...baseRow({ isActive: false }), _count: { children: 0 } };
    const { uc, adminCreateSpy, logSpy } = buildUpdate({ existing });
    await uc.execute(ADMIN_ID, ROOT_ID, { is_active: true });
    expect(adminCreateSpy.mock.calls[0]![0]!.data.action).toBe('reactivate');
    expect(logSpy).toHaveBeenCalledWith('service_category.reactivated', expect.any(Object));
  });

  it('EC-02 mover root con children a sub ⇒ INVALID_HIERARCHY_DEPTH', async () => {
    const existing = { ...baseRow(), _count: { children: 3 } };
    const { uc } = buildUpdate({
      existing,
      parentRow: { id: OTHER_ROOT_ID, parentId: null },
    });
    await expect(
      uc.execute(ADMIN_ID, ROOT_ID, { parent_id: OTHER_ROOT_ID }),
    ).rejects.toBeInstanceOf(InvalidHierarchyDepthError);
  });

  it('mover a parent que es child (nivel 3) ⇒ INVALID_HIERARCHY_DEPTH', async () => {
    const { uc } = buildUpdate({
      parentRow: { id: OTHER_ROOT_ID, parentId: ROOT_ID },
    });
    await expect(
      uc.execute(ADMIN_ID, ROOT_ID, { parent_id: OTHER_ROOT_ID }),
    ).rejects.toBeInstanceOf(InvalidHierarchyDepthError);
  });

  it('404 SERVICE_CATEGORY_NOT_FOUND cuando no existe', async () => {
    const { uc } = buildUpdate({ existing: null });
    await expect(
      uc.execute(ADMIN_ID, CHILD_ID, { is_active: true }),
    ).rejects.toBeInstanceOf(ServiceCategoryNotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SoftDeleteServiceCategoryUseCase
// ─────────────────────────────────────────────────────────────────────────────

function buildSoftDelete(opts: {
  existing?: Record<string, unknown> | null;
  usageCount?: number;
  childrenCount?: number;
} = {}) {
  const findFirstSpy = vi.fn().mockResolvedValue(opts.existing === undefined ? baseRow() : opts.existing);
  const usageCountSpy = vi.fn().mockResolvedValue(opts.usageCount ?? 0);
  const childrenCountSpy = vi.fn().mockResolvedValue(opts.childrenCount ?? 0);
  const updateSpy = vi.fn().mockImplementation(async (args: { where: { id: string }; data: Record<string, unknown> }) =>
    baseRow({ id: args.where.id, ...args.data }),
  );
  const adminCreateSpy = vi.fn().mockResolvedValue({ id: AA_ID });
  const logSpy = vi.fn();

  const tx = {
    serviceCategory: {
      findFirst: findFirstSpy,
      count: childrenCountSpy,
      update: updateSpy,
    },
    vendorService: { count: usageCountSpy },
    adminAction: { create: adminCreateSpy },
  };
  const prismaMock = {
    async $transaction<T>(fn: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
      return fn(tx as unknown as PrismaTypes.TransactionClient);
    },
  };
  const uc = new SoftDeleteServiceCategoryUseCase({ emit: logSpy }, prismaMock as never);
  return { uc, updateSpy, adminCreateSpy, logSpy };
}

describe('US-075 · SoftDeleteServiceCategoryUseCase', () => {
  const reason = 'Ya no aplica en LATAM verificado 2026-Q3.';

  it('AC-04 soft delete feliz ⇒ is_active=false + AdminAction soft_delete', async () => {
    const { uc, updateSpy, adminCreateSpy } = buildSoftDelete();
    const view = await uc.execute(ADMIN_ID, ROOT_ID, reason);
    expect(view.is_active).toBe(false);
    expect(updateSpy.mock.calls[0]![0]!.data.isActive).toBe(false);
    expect(adminCreateSpy.mock.calls[0]![0]!.data.action).toBe('soft_delete');
    expect((adminCreateSpy.mock.calls[0]![0]!.data.metadata as { reason: string }).reason).toBe(reason);
  });

  it('EC-03 con vendor_services ⇒ CATEGORY_IN_USE con usage_count', async () => {
    const { uc } = buildSoftDelete({ usageCount: 5 });
    try {
      await uc.execute(ADMIN_ID, ROOT_ID, reason);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryInUseError);
      expect((err as CategoryInUseError).usageCount).toBe(5);
    }
  });

  it('EC-04 con children activos ⇒ CATEGORY_HAS_CHILDREN', async () => {
    const { uc } = buildSoftDelete({ childrenCount: 2 });
    try {
      await uc.execute(ADMIN_ID, ROOT_ID, reason);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CategoryHasChildrenError);
      expect((err as CategoryHasChildrenError).childrenCount).toBe(2);
    }
  });

  it('404 SERVICE_CATEGORY_NOT_FOUND cuando no existe / soft-deleted', async () => {
    const { uc } = buildSoftDelete({ existing: null });
    await expect(uc.execute(ADMIN_ID, ROOT_ID, reason)).rejects.toBeInstanceOf(
      ServiceCategoryNotFoundError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ListServiceCategoriesUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe('US-075 · ListServiceCategoriesUseCase', () => {
  const rows = [
    baseRow({ id: ROOT_ID, code: 'music', sortOrder: 10 }),
    baseRow({ id: OTHER_ROOT_ID, code: 'catering', sortOrder: 20 }),
    baseRow({ id: CHILD_ID, code: 'marimba', parentId: ROOT_ID, depthLevel: 2, sortOrder: 10 }),
    baseRow({ id: AA_ID, code: 'inactive', isActive: false, sortOrder: 30 }),
  ];

  function buildList(all: unknown[] = rows) {
    const findManySpy = vi.fn().mockImplementation(async (args: { where: Record<string, unknown> }) => {
      const filtered = (all as ReturnType<typeof baseRow>[]).filter((r) => {
        if (args.where.deletedAt !== null) return false;
        if ('isActive' in args.where && args.where.isActive !== r.isActive) return false;
        return true;
      });
      return filtered;
    });
    const prismaMock = { serviceCategory: { findMany: findManySpy } };
    const uc = new ListServiceCategoriesUseCase(prismaMock as never);
    return { uc, findManySpy };
  }

  it('devuelve {tree, flat} con children anidados', async () => {
    const { uc } = buildList();
    const res = await uc.execute({ includeInactive: true });
    expect(res.flat).toHaveLength(4);
    expect(res.tree).toHaveLength(3); // 3 roots (music, catering, inactive)
    const music = res.tree.find((n) => n.code === 'music');
    expect(music?.children.map((c) => c.code)).toEqual(['marimba']);
  });

  it('filtra is_active=true en variante pública (default)', async () => {
    const { uc } = buildList();
    const res = await uc.execute();
    expect(res.flat.every((r) => r.is_active)).toBe(true);
  });
});
