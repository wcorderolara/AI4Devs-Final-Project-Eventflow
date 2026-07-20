// US-076 (PB-P1-043 / QA-001) — Unit tests para el CRUD admin de `EventType`.
//
// Cobertura:
//   DTOs (`Create/Update/DeleteEventTypeBodySchema` + `EventTypeIdParamsSchema`):
//     - shape strict (rechaza campos ajenos);
//     - `code` slug `^[a-z0-9_-]+$` (permite underscore para `baby_shower`), [1..64];
//     - `sort_order` int >= 0;
//     - update requiere al menos un campo (refine).
//
//   UseCases (branches de negocio con `code` estable):
//     - Create: AC-01 feliz, EC-02 code duplicado → DUPLICATE_CODE,
//       EC-03 name_i18n sin es-LATAM → INVALID_NAME_I18N, AdminAction chain,
//       log event_type.created.
//     - Update: AC-02 patch nombre + is_active, reactivate detection (false→true),
//       404 EVENT_TYPE_NOT_FOUND cuando no existe / soft-deleted.
//     - SoftDelete: AC-03 feliz, EC-01 con events asociados → EVENT_TYPE_IN_USE con
//       usage_count, 404 uniforme.
//     - List: shape plano ordenado, filtro is_active para variante pública.
import { describe, expect, it, vi } from 'vitest';
import type { Prisma as PrismaTypes } from '@prisma/client';
import {
  CreateEventTypeBodySchema,
  DeleteEventTypeBodySchema,
  EventTypeIdParamsSchema,
  UpdateEventTypeBodySchema,
} from '../../src/modules/event-catalog/interface/event-type.dto.js';
import { CreateEventTypeUseCase } from '../../src/modules/event-catalog/application/create-event-type.use-case.js';
import { UpdateEventTypeUseCase } from '../../src/modules/event-catalog/application/update-event-type.use-case.js';
import { SoftDeleteEventTypeUseCase } from '../../src/modules/event-catalog/application/soft-delete-event-type.use-case.js';
import { ListEventTypesUseCase } from '../../src/modules/event-catalog/application/list-event-types.use-case.js';
import {
  DuplicateEventTypeCodeError,
  EventTypeInUseError,
  EventTypeNotFoundError,
  InvalidNameI18nError,
} from '../../src/modules/event-catalog/domain/us076.errors.js';
import type { DomainEventLogger } from '../../src/shared/observability/domain-event-logger.js';

const ADMIN_ID = '99999999-9999-4999-8999-999999999999';
const ET_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

const NOW = new Date('2026-07-20T12:00:00Z');

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ET_ID,
    code: 'wedding',
    label: 'Boda',
    description: null,
    nameI18n: { 'es-LATAM': 'Boda' },
    descriptionI18n: null,
    sortOrder: 10,
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

describe('US-076 · DTO CreateEventTypeBodySchema', () => {
  const goodName = { 'es-LATAM': 'Boda' };
  it('acepta code feliz', () => {
    const p = CreateEventTypeBodySchema.safeParse({ code: 'wedding', name_i18n: goodName });
    expect(p.success).toBe(true);
  });
  it('acepta underscore en code (baby_shower)', () => {
    const p = CreateEventTypeBodySchema.safeParse({ code: 'baby_shower', name_i18n: goodName });
    expect(p.success).toBe(true);
  });
  it('rechaza code con mayúsculas', () => {
    const p = CreateEventTypeBodySchema.safeParse({ code: 'Wedding', name_i18n: goodName });
    expect(p.success).toBe(false);
  });
  it('rechaza campos ajenos (strict)', () => {
    const p = CreateEventTypeBodySchema.safeParse({
      code: 'wedding',
      name_i18n: goodName,
      unexpected: 'x',
    });
    expect(p.success).toBe(false);
  });
  it('acepta sort_order default 0 sin pasarlo', () => {
    const p = CreateEventTypeBodySchema.safeParse({ code: 'wedding', name_i18n: goodName });
    expect(p.success).toBe(true);
    if (p.success) expect(p.data.sort_order).toBe(0);
  });
  it('rechaza sort_order negativo', () => {
    const p = CreateEventTypeBodySchema.safeParse({
      code: 'wedding',
      name_i18n: goodName,
      sort_order: -1,
    });
    expect(p.success).toBe(false);
  });
  it('name_i18n sin es-LATAM pasa el shape (la invariante la valida el UseCase)', () => {
    const p = CreateEventTypeBodySchema.safeParse({ code: 'wedding', name_i18n: { en: 'Wed' } });
    expect(p.success).toBe(true);
  });
});

describe('US-076 · DTO UpdateEventTypeBodySchema', () => {
  it('acepta patch parcial', () => {
    const p = UpdateEventTypeBodySchema.safeParse({ sort_order: 5 });
    expect(p.success).toBe(true);
  });
  it('rechaza patch vacío (refine)', () => {
    const p = UpdateEventTypeBodySchema.safeParse({});
    expect(p.success).toBe(false);
  });
  it('acepta is_active bool', () => {
    const p = UpdateEventTypeBodySchema.safeParse({ is_active: false });
    expect(p.success).toBe(true);
  });
  it('rechaza campos ajenos', () => {
    const p = UpdateEventTypeBodySchema.safeParse({ sort_order: 5, weird: true });
    expect(p.success).toBe(false);
  });
});

describe('US-076 · DTO DeleteEventTypeBodySchema', () => {
  it('acepta reason string ≤ 500', () => {
    const p = DeleteEventTypeBodySchema.safeParse({ reason: 'ok'.repeat(6) });
    expect(p.success).toBe(true);
  });
  it('rechaza reason > 500', () => {
    const p = DeleteEventTypeBodySchema.safeParse({ reason: 'x'.repeat(501) });
    expect(p.success).toBe(false);
  });
});

describe('US-076 · DTO EventTypeIdParamsSchema', () => {
  it('acepta UUID válido', () => {
    const p = EventTypeIdParamsSchema.safeParse({ id: ET_ID });
    expect(p.success).toBe(true);
  });
  it('rechaza UUID malformado', () => {
    const p = EventTypeIdParamsSchema.safeParse({ id: 'not-a-uuid' });
    expect(p.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UseCase helpers — fake Prisma tx
// ─────────────────────────────────────────────────────────────────────────────

const noopLogger: DomainEventLogger = { emit: () => undefined };

function makeTx(overrides: Partial<Record<string, unknown>> = {}) {
  const eventType = {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(({ data }) => Promise.resolve(baseRow({ ...data }))),
    update: vi.fn().mockImplementation(({ data }) => Promise.resolve(baseRow({ ...data, id: ET_ID }))),
    count: vi.fn().mockResolvedValue(0),
    ...(overrides.eventType as object | undefined),
  };
  const event = {
    count: vi.fn().mockResolvedValue(0),
    ...(overrides.event as object | undefined),
  };
  const adminAction = {
    create: vi.fn().mockResolvedValue({ id: 'aa-1' }),
    ...(overrides.adminAction as object | undefined),
  };
  return { eventType, event, adminAction };
}

function makePrismaWithTx(tx: ReturnType<typeof makeTx>) {
  return {
    $transaction: vi.fn().mockImplementation(async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx)),
    eventType: tx.eventType,
    event: tx.event,
  } as unknown as PrismaTypes.TransactionClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// CreateEventTypeUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · CreateEventTypeUseCase', () => {
  it('AC-01 crear feliz + AdminAction append-only + log event_type.created', async () => {
    const tx = makeTx();
    const prisma = makePrismaWithTx(tx);
    const logger = { emit: vi.fn() } satisfies DomainEventLogger;
    const uc = new CreateEventTypeUseCase(logger, prisma as never);

    const view = await uc.execute(ADMIN_ID, {
      code: 'wedding',
      name_i18n: { 'es-LATAM': 'Boda' },
      sort_order: 10,
    });

    expect(view.code).toBe('wedding');
    expect(view.label).toBe('Boda');
    expect(view.is_active).toBe(true);
    expect(tx.eventType.create).toHaveBeenCalledOnce();
    expect(tx.adminAction.create).toHaveBeenCalledOnce();
    const args = tx.adminAction.create.mock.calls[0]![0] as { data: { action: string; targetEntity: string } };
    expect(args.data.action).toBe('create');
    expect(args.data.targetEntity).toBe('event_type');
    expect(logger.emit).toHaveBeenCalledWith('event_type.created', expect.objectContaining({ eventTypeId: expect.any(String), code: 'wedding' }));
  });

  it('EC-03 name_i18n sin es-LATAM → INVALID_NAME_I18N', async () => {
    const uc = new CreateEventTypeUseCase(noopLogger, makePrismaWithTx(makeTx()) as never);
    await expect(
      uc.execute(ADMIN_ID, { code: 'wedding', name_i18n: { en: 'Wed' } as never }),
    ).rejects.toBeInstanceOf(InvalidNameI18nError);
  });

  it('EC-02 code duplicado → DUPLICATE_CODE', async () => {
    const tx = makeTx({
      eventType: {
        findUnique: vi.fn().mockResolvedValue({ id: OTHER_ID }),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    });
    const uc = new CreateEventTypeUseCase(noopLogger, makePrismaWithTx(tx) as never);
    await expect(
      uc.execute(ADMIN_ID, { code: 'wedding', name_i18n: { 'es-LATAM': 'Boda' } }),
    ).rejects.toBeInstanceOf(DuplicateEventTypeCodeError);
    expect(tx.eventType.create).not.toHaveBeenCalled();
    expect(tx.adminAction.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UpdateEventTypeUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · UpdateEventTypeUseCase', () => {
  it('AC-02 patch nombre + sort_order → AdminAction action=update + log event_type.updated', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(baseRow()),
        update: vi.fn().mockResolvedValue(baseRow({ label: 'Boda LX', sortOrder: 99 })),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
    });
    const logger = { emit: vi.fn() } satisfies DomainEventLogger;
    const uc = new UpdateEventTypeUseCase(logger, makePrismaWithTx(tx) as never);

    const view = await uc.execute(ADMIN_ID, ET_ID, {
      name_i18n: { 'es-LATAM': 'Boda LX' },
      sort_order: 99,
    });

    expect(view.label).toBe('Boda LX');
    const args = tx.adminAction.create.mock.calls[0]![0] as { data: { action: string } };
    expect(args.data.action).toBe('update');
    expect(logger.emit).toHaveBeenCalledWith('event_type.updated', expect.anything());
  });

  it('reactivate: is_active pasa false→true → action=reactivate + log event_type.reactivated', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(baseRow({ isActive: false })),
        update: vi.fn().mockResolvedValue(baseRow({ isActive: true })),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
    });
    const logger = { emit: vi.fn() } satisfies DomainEventLogger;
    const uc = new UpdateEventTypeUseCase(logger, makePrismaWithTx(tx) as never);

    await uc.execute(ADMIN_ID, ET_ID, { is_active: true });

    const args = tx.adminAction.create.mock.calls[0]![0] as { data: { action: string } };
    expect(args.data.action).toBe('reactivate');
    expect(logger.emit).toHaveBeenCalledWith('event_type.reactivated', expect.anything());
  });

  it('404 EVENT_TYPE_NOT_FOUND cuando no existe / soft-deleted', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
    });
    const uc = new UpdateEventTypeUseCase(noopLogger, makePrismaWithTx(tx) as never);
    await expect(
      uc.execute(ADMIN_ID, ET_ID, { sort_order: 5 }),
    ).rejects.toBeInstanceOf(EventTypeNotFoundError);
  });

  it('name_i18n sin es-LATAM en patch → INVALID_NAME_I18N', async () => {
    const uc = new UpdateEventTypeUseCase(noopLogger, makePrismaWithTx(makeTx()) as never);
    await expect(
      uc.execute(ADMIN_ID, ET_ID, { name_i18n: { en: 'Only en' } as never }),
    ).rejects.toBeInstanceOf(InvalidNameI18nError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SoftDeleteEventTypeUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · SoftDeleteEventTypeUseCase', () => {
  it('AC-03 feliz sin dependencias → is_active=false + AdminAction soft_delete + log', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(baseRow()),
        update: vi.fn().mockResolvedValue(baseRow({ isActive: false })),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      event: { count: vi.fn().mockResolvedValue(0) },
    });
    const logger = { emit: vi.fn() } satisfies DomainEventLogger;
    const uc = new SoftDeleteEventTypeUseCase(logger, makePrismaWithTx(tx) as never);

    const view = await uc.execute(ADMIN_ID, ET_ID, 'razón suficientemente larga para pasar validación');
    expect(view.is_active).toBe(false);
    const args = tx.adminAction.create.mock.calls[0]![0] as { data: { action: string } };
    expect(args.data.action).toBe('soft_delete');
    expect(logger.emit).toHaveBeenCalledWith('event_type.soft_deleted', expect.anything());
  });

  it('EC-01 con events asociados → EVENT_TYPE_IN_USE con usage_count', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(baseRow()),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      event: { count: vi.fn().mockResolvedValue(5) },
    });
    const uc = new SoftDeleteEventTypeUseCase(noopLogger, makePrismaWithTx(tx) as never);
    const err = await uc.execute(ADMIN_ID, ET_ID, 'razón válida diez chars').catch((e) => e);
    expect(err).toBeInstanceOf(EventTypeInUseError);
    expect((err as EventTypeInUseError).usageCount).toBe(5);
    expect(tx.eventType.update).not.toHaveBeenCalled();
    expect(tx.adminAction.create).not.toHaveBeenCalled();
  });

  it('404 uniforme cuando el EventType no existe', async () => {
    const tx = makeTx({
      eventType: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
    });
    const uc = new SoftDeleteEventTypeUseCase(noopLogger, makePrismaWithTx(tx) as never);
    await expect(uc.execute(ADMIN_ID, ET_ID, 'razón válida diez'))
      .rejects.toBeInstanceOf(EventTypeNotFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ListEventTypesUseCase
// ─────────────────────────────────────────────────────────────────────────────

describe('US-076 · ListEventTypesUseCase', () => {
  it('variante pública filtra is_active=true', async () => {
    const prisma = {
      eventType: {
        findMany: vi.fn().mockResolvedValue([
          baseRow({ id: '1', code: 'wedding', sortOrder: 10 }),
          baseRow({ id: '2', code: 'xv', sortOrder: 20 }),
        ]),
      },
    } as unknown as PrismaTypes.TransactionClient;
    const uc = new ListEventTypesUseCase(prisma as never);
    const items = await uc.execute({ includeInactive: false });
    expect(items).toHaveLength(2);
    const where = (prisma.eventType.findMany as ReturnType<typeof vi.fn>).mock.calls[0]![0].where;
    expect(where).toEqual({ deletedAt: null, isActive: true });
  });

  it('variante admin incluye inactivos', async () => {
    const prisma = {
      eventType: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaTypes.TransactionClient;
    const uc = new ListEventTypesUseCase(prisma as never);
    await uc.execute({ includeInactive: true });
    const where = (prisma.eventType.findMany as ReturnType<typeof vi.fn>).mock.calls[0]![0].where;
    expect(where).toEqual({ deletedAt: null });
  });
});
