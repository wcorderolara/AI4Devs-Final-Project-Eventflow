// PR-6 — Caracterización de las escrituras admin de catálogos (event-types y
// service-categories) y de los adapters de `admin_actions`. Fija con igualdad exacta:
//   * args de `adminAction.create` (columnas + `metadata` + `select`),
//   * args de `create`/`update` sobre el catálogo (denormalización de label/description),
//   * eventos de dominio emitidos y vistas devueltas.
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { CreateEventTypeUseCase } from '../../src/modules/event-catalog/application/create-event-type.use-case.js';
import { UpdateEventTypeUseCase } from '../../src/modules/event-catalog/application/update-event-type.use-case.js';
import { SoftDeleteEventTypeUseCase } from '../../src/modules/event-catalog/application/soft-delete-event-type.use-case.js';
import { CreateServiceCategoryUseCase } from '../../src/modules/service-catalog/application/create-service-category.use-case.js';
import { UpdateServiceCategoryUseCase } from '../../src/modules/service-catalog/application/update-service-category.use-case.js';
import { SoftDeleteServiceCategoryUseCase } from '../../src/modules/service-catalog/application/soft-delete-service-category.use-case.js';
import { PrismaAdminActionRepository } from '../../src/modules/admin-governance/infrastructure/prisma-admin-action.repository.js';
import { PrismaAdminActionWriteAdapter } from '../../src/modules/vendor-management/infrastructure/prisma-admin-action-write.adapter.js';

const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const ROW_ID = '11111111-1111-4111-8111-111111111111';
const PARENT_ID = '22222222-2222-4222-8222-222222222222';
const T0 = new Date('2026-07-01T00:00:00Z');

function row(over: Record<string, unknown> = {}) {
  return {
    id: ROW_ID,
    code: 'wedding',
    label: 'Boda',
    description: null,
    nameI18n: { 'es-LATAM': 'Boda' },
    descriptionI18n: null,
    parentId: null,
    sortOrder: 3,
    depthLevel: 1,
    isActive: true,
    createdAt: T0,
    updatedAt: T0,
    deletedAt: null,
    ...over,
  };
}

/** tx falso: cada modelo devuelve la fila "existente" fusionada con `data`. */
function fakeTx(existing: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  const model = () => ({
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(existing),
    create: vi.fn().mockImplementation(({ data }) => Promise.resolve(row({ ...data, id: ROW_ID }))),
    update: vi.fn().mockImplementation(({ data }) => Promise.resolve(row({ ...existing, ...data }))),
    count: vi.fn().mockResolvedValue(0),
  });
  const tx = {
    eventType: model(),
    serviceCategory: model(),
    event: { count: vi.fn().mockResolvedValue(0) },
    vendorService: { count: vi.fn().mockResolvedValue(0) },
    adminAction: { create: vi.fn().mockResolvedValue({ id: 'aa-1' }) },
    ...extra,
  };
  const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
  const logger = { emit: vi.fn() };
  return { tx, prisma: prisma as never, logger };
}

describe('PR-6 caracterización — EventType admin', () => {
  it('create: fila + AdminAction create + log', async () => {
    const { tx, prisma, logger } = fakeTx(null);
    const view = await new CreateEventTypeUseCase(logger, prisma).execute(
      ADMIN_ID,
      {
        code: 'wedding',
        name_i18n: { 'es-LATAM': 'Boda', en: 'Wedding' },
        description_i18n: { 'es-LATAM': 'Desc' },
        sort_order: 3,
        reason: 'Alta del catálogo inicial',
      },
      { correlationId: 'cid-1' },
    );
    expect(tx.eventType.create.mock.calls[0]![0]).toEqual({
      data: {
        code: 'wedding',
        label: 'Boda',
        description: 'Desc',
        nameI18n: { 'es-LATAM': 'Boda', en: 'Wedding' },
        descriptionI18n: { 'es-LATAM': 'Desc' },
        sortOrder: 3,
        isActive: true,
      },
    });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'create',
            targetEntity: 'event_type',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-1',
              reason: 'Alta del catálogo inicial',
              snapshot: {
                code: 'wedding',
                sort_order: 3,
                name_i18n: { 'es-LATAM': 'Boda', en: 'Wedding' },
                description_i18n: { 'es-LATAM': 'Desc' },
              },
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls).toEqual([
      [
        'event_type.created',
        {
          correlationId: 'cid-1',
          actorId: ADMIN_ID,
          adminUserId: ADMIN_ID,
          eventTypeId: ROW_ID,
          code: 'wedding',
          adminActionId: 'aa-1',
        },
      ],
    ]);
    expect(view.label).toBe('Boda');
  });

  it('create sin description/reason/sort_order/correlationId', async () => {
    const { tx, prisma } = fakeTx(null);
    await new CreateEventTypeUseCase({ emit: vi.fn() }, prisma).execute(ADMIN_ID, {
      code: 'wedding',
      name_i18n: { 'es-LATAM': 'Boda' },
    });
    expect(tx.eventType.create.mock.calls[0]![0]).toEqual({
      data: {
        code: 'wedding',
        label: 'Boda',
        description: null,
        nameI18n: { 'es-LATAM': 'Boda' },
        descriptionI18n: undefined,
        sortOrder: 0,
        isActive: true,
      },
    });
    expect(tx.adminAction.create.mock.calls[0]![0].data.metadata).toEqual({
      correlationId: null,
      reason: null,
      snapshot: {
        code: 'wedding',
        sort_order: 0,
        name_i18n: { 'es-LATAM': 'Boda' },
        description_i18n: null,
      },
    });
  });

  it('update: patch + AdminAction update con from/to/patched_fields', async () => {
    const { tx, prisma, logger } = fakeTx(row());
    await new UpdateEventTypeUseCase(logger, prisma).execute(
      ADMIN_ID,
      ROW_ID,
      {
        name_i18n: { 'es-LATAM': 'Boda civil' },
        description_i18n: { en: 'Only en' },
        sort_order: 7,
        reason: 'Ajuste de orden',
      },
      { correlationId: 'cid-2' },
    );
    expect(tx.eventType.update.mock.calls[0]![0]).toEqual({
      where: { id: ROW_ID },
      data: {
        nameI18n: { 'es-LATAM': 'Boda civil' },
        label: 'Boda civil',
        descriptionI18n: { en: 'Only en' },
        description: null,
        sortOrder: 7,
      },
    });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'update',
            targetEntity: 'event_type',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-2',
              reason: 'Ajuste de orden',
              from: { sort_order: 3, is_active: true },
              to: { sort_order: 7, is_active: true },
              patched_fields: ['name_i18n', 'description_i18n', 'sort_order'],
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls[0]![0]).toBe('event_type.updated');
  });

  it('update false→true ⇒ action reactivate', async () => {
    const { tx, prisma, logger } = fakeTx(row({ isActive: false }));
    await new UpdateEventTypeUseCase(logger, prisma).execute(ADMIN_ID, ROW_ID, { is_active: true });
    expect(tx.eventType.update.mock.calls[0]![0].data).toEqual({ isActive: true });
    expect(tx.adminAction.create.mock.calls[0]![0].data).toEqual({
      adminUserId: ADMIN_ID,
      action: 'reactivate',
      targetEntity: 'event_type',
      targetId: ROW_ID,
      metadata: {
        correlationId: null,
        reason: null,
        from: { sort_order: 3, is_active: false },
        to: { sort_order: 3, is_active: true },
        patched_fields: ['is_active'],
      },
    });
    expect(logger.emit.mock.calls).toEqual([
      [
        'event_type.reactivated',
        { correlationId: undefined, actorId: ADMIN_ID, adminUserId: ADMIN_ID, eventTypeId: ROW_ID, adminActionId: 'aa-1' },
      ],
    ]);
  });

  it('soft delete: is_active=false + AdminAction soft_delete con snapshot', async () => {
    const { tx, prisma, logger } = fakeTx(row());
    await new SoftDeleteEventTypeUseCase(logger, prisma).execute(
      ADMIN_ID,
      ROW_ID,
      'Ya no se ofrece este tipo',
      { correlationId: 'cid-3' },
    );
    expect(tx.eventType.update.mock.calls[0]![0]).toEqual({ where: { id: ROW_ID }, data: { isActive: false } });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'soft_delete',
            targetEntity: 'event_type',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-3',
              reason: 'Ya no se ofrece este tipo',
              snapshot: { code: 'wedding', sort_order: 3, was_active: true },
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls).toEqual([
      [
        'event_type.soft_deleted',
        { correlationId: 'cid-3', actorId: ADMIN_ID, adminUserId: ADMIN_ID, eventTypeId: ROW_ID, adminActionId: 'aa-1' },
      ],
    ]);
  });
});

describe('PR-6 caracterización — ServiceCategory admin', () => {
  it('create child: depth 2 + AdminAction create con snapshot jerárquico', async () => {
    const { tx, prisma, logger } = fakeTx(null);
    tx.serviceCategory.findUnique
      .mockResolvedValueOnce({ id: PARENT_ID, parentId: null }) // parent
      .mockResolvedValueOnce(null); // dup
    const view = await new CreateServiceCategoryUseCase(logger, prisma).execute(
      ADMIN_ID,
      {
        code: 'dj',
        name_i18n: { 'es-LATAM': 'DJ' },
        parent_id: PARENT_ID,
        sort_order: 2,
      },
      { correlationId: 'cid-4' },
    );
    expect(tx.serviceCategory.create.mock.calls[0]![0]).toEqual({
      data: {
        code: 'dj',
        label: 'DJ',
        description: null,
        nameI18n: { 'es-LATAM': 'DJ' },
        descriptionI18n: undefined,
        parentId: PARENT_ID,
        sortOrder: 2,
        depthLevel: 2,
        isActive: true,
      },
    });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'create',
            targetEntity: 'service_category',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-4',
              reason: null,
              snapshot: {
                code: 'dj',
                parent_id: PARENT_ID,
                sort_order: 2,
                depth_level: 2,
                name_i18n: { 'es-LATAM': 'DJ' },
                description_i18n: null,
              },
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls).toEqual([
      [
        'service_category.created',
        {
          correlationId: 'cid-4',
          actorId: ADMIN_ID,
          adminUserId: ADMIN_ID,
          serviceCategoryId: ROW_ID,
          code: 'dj',
          parentId: PARENT_ID,
          adminActionId: 'aa-1',
        },
      ],
    ]);
    expect(view.depth_level).toBe(2);
  });

  it('update: mover a root + reactivate', async () => {
    const existing = { ...row({ parentId: PARENT_ID, depthLevel: 2, isActive: false }), _count: { children: 0 } };
    const { tx, prisma, logger } = fakeTx(existing);
    await new UpdateServiceCategoryUseCase(logger, prisma).execute(
      ADMIN_ID,
      ROW_ID,
      { parent_id: null, is_active: true, description_i18n: { 'es-LATAM': 'D' }, reason: 'Reorganizar' },
      { correlationId: 'cid-5' },
    );
    expect(tx.serviceCategory.update.mock.calls[0]![0]).toEqual({
      where: { id: ROW_ID },
      data: {
        descriptionI18n: { 'es-LATAM': 'D' },
        description: 'D',
        parent: { disconnect: true },
        depthLevel: 1,
        isActive: true,
      },
    });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'reactivate',
            targetEntity: 'service_category',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-5',
              reason: 'Reorganizar',
              from: { parent_id: PARENT_ID, sort_order: 3, is_active: false, depth_level: 2 },
              // El fake fusiona `data` sobre la fila: `parent` no se traduce a `parentId`.
              to: { parent_id: PARENT_ID, sort_order: 3, is_active: true, depth_level: 1 },
              patched_fields: ['parent_id', 'is_active', 'description_i18n'],
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls[0]![0]).toBe('service_category.reactivated');
  });

  it('update: mover a sub de un root (connect) ⇒ action update', async () => {
    const existing = { ...row(), _count: { children: 0 } };
    const { tx, prisma, logger } = fakeTx(existing);
    tx.serviceCategory.findUnique.mockResolvedValueOnce({ id: PARENT_ID, parentId: null });
    await new UpdateServiceCategoryUseCase(logger, prisma).execute(ADMIN_ID, ROW_ID, {
      parent_id: PARENT_ID,
      name_i18n: { 'es-LATAM': 'Nuevo' },
    });
    expect(tx.serviceCategory.update.mock.calls[0]![0].data).toEqual({
      nameI18n: { 'es-LATAM': 'Nuevo' },
      label: 'Nuevo',
      parent: { connect: { id: PARENT_ID } },
      depthLevel: 2,
    });
    expect(tx.adminAction.create.mock.calls[0]![0].data.action).toBe('update');
    expect(logger.emit.mock.calls[0]![0]).toBe('service_category.updated');
  });

  it('soft delete: AdminAction soft_delete con snapshot jerárquico', async () => {
    const { tx, prisma, logger } = fakeTx(row({ code: 'dj', parentId: PARENT_ID, depthLevel: 2 }));
    await new SoftDeleteServiceCategoryUseCase(logger, prisma).execute(
      ADMIN_ID,
      ROW_ID,
      'Categoría duplicada',
      { correlationId: 'cid-6' },
    );
    expect(tx.serviceCategory.update.mock.calls[0]![0]).toEqual({ where: { id: ROW_ID }, data: { isActive: false } });
    expect(tx.adminAction.create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'soft_delete',
            targetEntity: 'service_category',
            targetId: ROW_ID,
            metadata: {
              correlationId: 'cid-6',
              reason: 'Categoría duplicada',
              snapshot: { code: 'dj', parent_id: PARENT_ID, sort_order: 3, depth_level: 2, was_active: true },
            },
          },
          select: { id: true },
        },
      ],
    ]);
    expect(logger.emit.mock.calls).toEqual([
      [
        'service_category.soft_deleted',
        { correlationId: 'cid-6', actorId: ADMIN_ID, adminUserId: ADMIN_ID, serviceCategoryId: ROW_ID, adminActionId: 'aa-1' },
      ],
    ]);
  });
});

describe('PR-6 caracterización — adapters de admin_actions', () => {
  it('PrismaAdminActionRepository (US-016): metadata con correlationId + extra, isSeed=false', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'aa-2', createdAt: T0 });
    const out = await new PrismaAdminActionRepository().create({ adminAction: { create } } as never, {
      adminUserId: ADMIN_ID,
      action: 'view_event',
      targetEntity: 'event',
      targetId: ROW_ID,
      correlationId: 'cid-7',
      extraMetadata: { reason: 'soporte' },
    });
    expect(out).toEqual({ id: 'aa-2', createdAt: T0 });
    expect(create.mock.calls).toEqual([
      [
        {
          data: {
            adminUserId: ADMIN_ID,
            action: 'view_event',
            targetEntity: 'event',
            targetId: ROW_ID,
            metadata: { correlationId: 'cid-7', reason: 'soporte' },
            isSeed: false,
          },
          select: { id: true, createdAt: true },
        },
      ],
    ]);
    create.mockClear();
    await new PrismaAdminActionRepository().create({ adminAction: { create } } as never, {
      adminUserId: ADMIN_ID,
      action: 'view_event',
      targetEntity: 'event',
      targetId: ROW_ID,
      correlationId: null,
    });
    expect(create.mock.calls[0]![0].data.metadata).toEqual({ correlationId: null });
  });

  it('PrismaAdminActionWriteAdapter (US-041): columnas de actor, correlation_id y metadata', async () => {
    const baseCreate = vi.fn().mockResolvedValue({ id: 'x' });
    const txCreate = vi.fn().mockResolvedValue({ id: 'y' });
    const adapter = new PrismaAdminActionWriteAdapter({ adminAction: { create: baseCreate } } as never);

    await adapter.create({
      action: 'vendor_pending_after_major_edit',
      targetEntity: 'vendor_profile',
      targetId: ROW_ID,
      actorUserId: 'u-vendor',
      actorRole: 'vendor',
      metadata: { fields: ['businessName'] },
    });
    expect(baseCreate.mock.calls).toEqual([
      [
        {
          data: {
            action: 'vendor_pending_after_major_edit',
            targetEntity: 'vendor_profile',
            targetId: ROW_ID,
            adminUserId: null,
            actorUserId: 'u-vendor',
            actorRole: 'vendor',
            correlationId: null,
            metadata: { fields: ['businessName'] },
          },
        },
      ],
    ]);

    await adapter.create(
      {
        action: 'vendor_soft_deleted',
        targetEntity: 'vendor_profile',
        targetId: ROW_ID,
        actorUserId: ADMIN_ID,
        actorRole: 'admin',
        adminUserId: ADMIN_ID,
        correlationId: 'cid-8',
        metadata: null,
      },
      { adminAction: { create: txCreate } } as never,
    );
    expect(baseCreate).toHaveBeenCalledTimes(1);
    expect(txCreate.mock.calls).toEqual([
      [
        {
          data: {
            action: 'vendor_soft_deleted',
            targetEntity: 'vendor_profile',
            targetId: ROW_ID,
            adminUserId: ADMIN_ID,
            actorUserId: ADMIN_ID,
            actorRole: 'admin',
            correlationId: 'cid-8',
            metadata: Prisma.JsonNull,
          },
        },
      ],
    ]);
  });
});
