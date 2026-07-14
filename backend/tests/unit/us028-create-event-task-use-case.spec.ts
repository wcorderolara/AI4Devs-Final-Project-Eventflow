// US-028 (PB-P1-018) / QA-001 — Unit tests del `CreateEventTaskUseCase`.
// Cubre AC-01..05 (happy) + EC-06 (categoría inválida) + EC-07 (evento no mutable) +
// EC-09/EC-10 (no-revelación 404 para ajeno/soft-deleted).
import { describe, it, expect, vi } from 'vitest';
import { CreateEventTaskUseCase } from '../../src/modules/task-management/create/application/create-event-task.use-case.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { EventNotMutableError } from '../../src/modules/task-management/bulk-confirm/domain/errors/bulk-confirm.errors.js';
import { CategoryNotAvailableError } from '../../src/modules/task-management/create/domain/errors/create-event-task.errors.js';
import type { OwnedEventForCreateReader } from '../../src/modules/task-management/create/ports/owned-event-for-create.reader.js';
import type { ServiceCategoryReadPort } from '../../src/modules/task-management/create/ports/service-category-read.port.js';
import type { EventTaskCreateRepository } from '../../src/modules/task-management/create/ports/event-task-create.repository.js';
import type { EventTaskRow } from '../../src/modules/task-management/list/ports/event-task-list.repository.js';

const ACTOR = '22222222-2222-4222-8222-222222222222';
const EVENT = '33333333-3333-4333-8333-333333333333';
const CORRELATION = 'corr-us028';

function _stubPrisma(cb: (tx: unknown) => Promise<unknown>): {
  $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
} {
  return { $transaction: async (fn) => cb(fn) };
}

// PrismaClient minimal shim para el use case.
function prismaShim(): { $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown> } {
  return {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
      fn({ /* stub tx */ }),
  };
}

const baseRow: EventTaskRow = {
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Reservar salón',
  dueDate: null,
  status: 'pending',
  categoryCode: null,
  aiGenerated: false,
  aiRecommendationId: null,
  confirmedAt: null,
  createdAt: new Date('2026-07-14T10:00:00Z'),
  updatedAt: new Date('2026-07-14T10:00:00Z'),
};

interface MakeMocksOverrides {
  event?: Awaited<ReturnType<OwnedEventForCreateReader['findOwnedForUpdate']>>;
  category?: Awaited<ReturnType<ServiceCategoryReadPort['findActiveByCode']>>;
  repoRow?: EventTaskRow;
}

function makeMocks(overrides: MakeMocksOverrides = {}): {
  eventReader: OwnedEventForCreateReader;
  categoryReader: ServiceCategoryReadPort;
  repository: EventTaskCreateRepository;
} {
  const hasEventOverride = 'event' in overrides;
  const event = hasEventOverride
    ? overrides.event
    : {
        id: EVENT,
        status: 'active' as const,
        language: 'es_LATAM' as const,
        deletedAt: null,
      };
  const hasCategoryOverride = 'category' in overrides;
  const category = hasCategoryOverride
    ? overrides.category
    : { code: 'catering', label: 'Catering' };
  return {
    eventReader: {
      findOwnedForUpdate: vi.fn().mockResolvedValue(event),
    },
    categoryReader: {
      findActiveByCode: vi.fn().mockResolvedValue(category),
    },
    repository: {
      create: vi.fn().mockResolvedValue(overrides.repoRow ?? baseRow),
    },
  };
}

describe('US-028 CreateEventTaskUseCase — AC-01 happy title-only', () => {
  it('inserta con defaults canónicos y devuelve TaskListItemDto', async () => {
    const mocks = makeMocks();
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    const dto = await uc.execute({
      actorId: ACTOR,
      eventId: EVENT,
      body: { title: 'Reservar salón', description: null, due_date: null, category_code: null },
      ignoredFields: [],
      correlationId: CORRELATION,
    });
    expect(dto.status).toBe('pending');
    expect(dto.ai_generated).toBe(false);
    expect(dto.ai_recommendation_id).toBe(null);
    expect(mocks.categoryReader.findActiveByCode).not.toHaveBeenCalled();
    expect(mocks.repository.create).toHaveBeenCalledOnce();
  });
});

describe('US-028 — EC-07 evento no mutable', () => {
  it('status=cancelled → EventNotMutableError', async () => {
    const mocks = makeMocks({
      event: { id: EVENT, status: 'cancelled', language: 'es_LATAM', deletedAt: null },
    });
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    await expect(
      uc.execute({
        actorId: ACTOR,
        eventId: EVENT,
        body: { title: 'x1', description: null, due_date: null, category_code: null },
        ignoredFields: [],
        correlationId: CORRELATION,
      }),
    ).rejects.toBeInstanceOf(EventNotMutableError);
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it('status=completed → EventNotMutableError', async () => {
    const mocks = makeMocks({
      event: { id: EVENT, status: 'completed', language: 'es_LATAM', deletedAt: null },
    });
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    await expect(
      uc.execute({
        actorId: ACTOR,
        eventId: EVENT,
        body: { title: 'x2', description: null, due_date: null, category_code: null },
        ignoredFields: [],
        correlationId: CORRELATION,
      }),
    ).rejects.toBeInstanceOf(EventNotMutableError);
  });
});

describe('US-028 — EC-09/EC-10 no-revelación 404', () => {
  it('evento inexistente/ajeno → NotFoundError', async () => {
    const mocks = makeMocks({ event: null });
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    await expect(
      uc.execute({
        actorId: ACTOR,
        eventId: EVENT,
        body: { title: 'x3', description: null, due_date: null, category_code: null },
        ignoredFields: [],
        correlationId: CORRELATION,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('evento soft-deleted → NotFoundError', async () => {
    const mocks = makeMocks({
      event: { id: EVENT, status: 'draft', language: 'es_LATAM', deletedAt: new Date() },
    });
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    await expect(
      uc.execute({
        actorId: ACTOR,
        eventId: EVENT,
        body: { title: 'x4', description: null, due_date: null, category_code: null },
        ignoredFields: [],
        correlationId: CORRELATION,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('US-028 — EC-06 categoría inválida', () => {
  it('category_code no encontrado → CategoryNotAvailableError', async () => {
    const mocks = makeMocks({ category: null });
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    await expect(
      uc.execute({
        actorId: ACTOR,
        eventId: EVENT,
        body: { title: 'x5', description: null, due_date: null, category_code: 'inventada' },
        ignoredFields: [],
        correlationId: CORRELATION,
      }),
    ).rejects.toBeInstanceOf(CategoryNotAvailableError);
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });
});

describe('US-028 — AC-02 todos los campos + AC-03 server-controlled', () => {
  it('propaga campos y hereda languageCode del evento', async () => {
    const mocks = makeMocks();
    const uc = new CreateEventTaskUseCase(
      prismaShim() as unknown as ConstructorParameters<typeof CreateEventTaskUseCase>[0],
      mocks.eventReader,
      mocks.categoryReader,
      mocks.repository,
    );
    const future = new Date(Date.now() + 86400_000).toISOString();
    await uc.execute({
      actorId: ACTOR,
      eventId: EVENT,
      body: {
        title: 'Confirmar menú',
        description: 'Llamar el lunes',
        due_date: future,
        category_code: 'catering',
      },
      ignoredFields: ['ai_generated', 'status'],
      correlationId: CORRELATION,
    });
    const call = (mocks.repository.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      languageCode: string;
      createdByUserId: string;
      title: string;
      dueDate: string | null;
      categoryCode: string | null;
    };
    expect(call.languageCode).toBe('es_LATAM');
    expect(call.createdByUserId).toBe(ACTOR);
    expect(call.title).toBe('Confirmar menú');
    expect(call.dueDate).toBe(future);
    expect(call.categoryCode).toBe('catering');
  });
});
