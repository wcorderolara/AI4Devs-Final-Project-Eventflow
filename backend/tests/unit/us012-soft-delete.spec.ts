// US-012 — SoftDeleteEventUseCase: soft delete SOLO desde `draft` y del owner (AC-01; VR-01).
// US-009 — Catálogos: ListActiveEventTypesUseCase / ListActiveLocationsUseCase.
import { describe, it, expect } from 'vitest';
import { SoftDeleteEventUseCase } from '../../src/modules/event-planning/application/soft-delete-event.use-case.js';
import { ListActiveEventTypesUseCase } from '../../src/modules/event-planning/application/list-event-types.use-case.js';
import { ListActiveLocationsUseCase } from '../../src/modules/event-planning/application/list-locations.use-case.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { ConflictError } from '../../src/shared/domain/errors/conflict.error.js';
import type {
  EventRepository,
  EventTypeRepository,
  LocationRepository,
} from '../../src/modules/event-planning/ports/event.repository.js';
import type { EventAuditLogger, EventAuditName } from '../../src/modules/event-planning/ports/event-audit-logger.js';
import type { EventStatusValue } from '../../src/modules/event-planning/domain/event-lifecycle.js';
import type { EventView } from '../../src/modules/event-planning/domain/event.js';

function baseView(over: Partial<EventView>): EventView {
  return {
    id: 'e-1',
    ownerId: 'owner-1',
    eventTypeCode: 'wedding',
    name: 'Boda',
    eventDate: '2026-12-01',
    guestsCount: 100,
    locationId: 'loc-1',
    estimatedBudget: '1000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
    status: 'draft',
    notes: null,
    autoCompleted: false,
    completedAt: null,
    createdAt: '2026-07-09T00:00:00.000Z',
    updatedAt: '2026-07-09T00:00:00.000Z',
    ...over,
  };
}

class FakeRepo implements EventRepository {
  byId = new Map<string, EventView>();
  deleted: string[] = [];
  seed(v: EventView): void {
    this.byId.set(v.id, v);
  }
  create(): Promise<EventView> {
    throw new Error('unused');
  }
  findByIdForOwner(eventId: string, ownerId: string): Promise<EventView | null> {
    const v = this.byId.get(eventId);
    return Promise.resolve(v && v.ownerId === ownerId ? v : null);
  }
  listByOwner(): Promise<{ items: EventView[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
  update(): Promise<EventView> {
    throw new Error('unused');
  }
  transitionStatus(_id: string, _s: EventStatusValue): Promise<EventView> {
    throw new Error('unused');
  }
  softDelete(eventId: string): Promise<void> {
    this.deleted.push(eventId);
    this.byId.delete(eventId);
    return Promise.resolve();
  }
  findExpiredActive(): Promise<{ id: string; eventDate: Date }[]> {
    return Promise.resolve([]);
  }
  markCompleted(): Promise<{ affected: number }> {
    return Promise.resolve({ affected: 0 });
  }
}

class FakeAudit implements EventAuditLogger {
  emitted: EventAuditName[] = [];
  emit(event: EventAuditName): void {
    this.emitted.push(event);
  }
}

describe('US-012 SoftDeleteEventUseCase', () => {
  it('AC-01: elimina (soft) un borrador propio y emite event.deleted', async () => {
    const repo = new FakeRepo();
    const audit = new FakeAudit();
    repo.seed(baseView({ id: 'e-1', ownerId: 'owner-1', status: 'draft' }));
    const uc = new SoftDeleteEventUseCase(repo, audit);

    await uc.execute('owner-1', 'e-1');

    expect(repo.deleted).toEqual(['e-1']);
    expect(audit.emitted).toContain('event.deleted');
  });

  it('VR-01: un evento activo NO se puede eliminar → ConflictError (409)', async () => {
    const repo = new FakeRepo();
    const audit = new FakeAudit();
    repo.seed(baseView({ id: 'e-2', ownerId: 'owner-1', status: 'active' }));
    const uc = new SoftDeleteEventUseCase(repo, audit);

    await expect(uc.execute('owner-1', 'e-2')).rejects.toBeInstanceOf(ConflictError);
    expect(repo.deleted).toEqual([]);
    expect(audit.emitted).toContain('event.delete_rejected');
  });

  it('ownership opaque: evento ajeno → NotFoundError (404)', async () => {
    const repo = new FakeRepo();
    const audit = new FakeAudit();
    repo.seed(baseView({ id: 'e-3', ownerId: 'other-owner', status: 'draft' }));
    const uc = new SoftDeleteEventUseCase(repo, audit);

    await expect(uc.execute('owner-1', 'e-3')).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.deleted).toEqual([]);
  });
});

describe('US-009 catálogos', () => {
  it('ListActiveEventTypesUseCase devuelve el catálogo del repo', async () => {
    const repo: EventTypeRepository = {
      findActiveIdByCode: () => Promise.resolve(null),
      findActive: () => Promise.resolve([{ code: 'wedding', label: 'Boda' }]),
    };
    const uc = new ListActiveEventTypesUseCase(repo);
    await expect(uc.execute()).resolves.toEqual([{ code: 'wedding', label: 'Boda' }]);
  });

  it('ListActiveLocationsUseCase devuelve el catálogo del repo', async () => {
    const repo: LocationRepository = {
      existsActive: () => Promise.resolve(true),
      listActive: () => Promise.resolve([{ id: 'loc-1', country: 'GT', region: null, city: 'Guatemala' }]),
    };
    const uc = new ListActiveLocationsUseCase(repo);
    await expect(uc.execute()).resolves.toHaveLength(1);
  });
});
