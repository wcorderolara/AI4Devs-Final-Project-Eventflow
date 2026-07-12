// US-095 / QA-001 — Unit tests de use cases de Event con fakes en memoria (sin BD).
// AC-01..AC-07; EC-03/04/05. Verifican catálogos, currency inmutable, transiciones y ownership.
import { describe, it, expect, beforeEach } from 'vitest';
import type {
  EventRepository,
  EventTypeRepository,
  LocationRepository,
  EventListFilters,
  EventListOptions,
} from '../../src/modules/event-planning/ports/event.repository.js';
import type { EventAuditLogger, EventAuditName } from '../../src/modules/event-planning/ports/event-audit-logger.js';
import type { CreateEventData, EventView, UpdateEventData } from '../../src/modules/event-planning/domain/event.js';
import type { EventStatusValue } from '../../src/modules/event-planning/domain/event-lifecycle.js';
import { CreateEventUseCase } from '../../src/modules/event-planning/application/create-event.use-case.js';
import { UpdateEventUseCase } from '../../src/modules/event-planning/application/update-event.use-case.js';
import { ActivateEventUseCase } from '../../src/modules/event-planning/application/activate-event.use-case.js';
import { CancelEventUseCase } from '../../src/modules/event-planning/application/cancel-event.use-case.js';
import { GetEventByIdUseCase } from '../../src/modules/event-planning/application/get-event-by-id.use-case.js';
import { NotFoundError } from '../../src/shared/domain/errors/not-found.error.js';
import { CurrencyImmutableError } from '../../src/shared/domain/errors/currency-immutable.error.js';
import { BusinessRuleViolationError } from '../../src/shared/domain/errors/business-rule-violation.error.js';

function baseView(over: Partial<EventView> = {}): EventView {
  return {
    id: over.id ?? 'e-1',
    ownerId: over.ownerId ?? 'org-1',
    eventTypeCode: over.eventTypeCode ?? 'wedding',
    name: over.name ?? 'Boda',
    eventDate: over.eventDate ?? '2026-12-31',
    guestsCount: over.guestsCount ?? 100,
    locationId: over.locationId ?? 'loc-1',
    estimatedBudget: over.estimatedBudget ?? '1000.00',
    currencyCode: over.currencyCode ?? 'GTQ',
    languageCode: over.languageCode ?? 'es-LATAM',
    status: over.status ?? 'draft',
    notes: over.notes ?? null,
    autoCompleted: over.autoCompleted ?? false,
    completedAt: over.completedAt ?? null,
    createdAt: over.createdAt ?? '2026-07-09T00:00:00.000Z',
    updatedAt: over.updatedAt ?? '2026-07-09T00:00:00.000Z',
  };
}

class FakeEventRepo implements EventRepository {
  byId = new Map<string, EventView>();
  private seq = 0;
  seed(v: EventView): void {
    this.byId.set(v.id, v);
  }
  create(data: CreateEventData): Promise<EventView> {
    const v = baseView({
      id: `e-${++this.seq}`,
      ownerId: data.ownerId,
      name: data.name,
      eventDate: data.eventDate,
      guestsCount: data.guestsCount,
      locationId: data.locationId,
      estimatedBudget: data.estimatedBudget,
      currencyCode: data.currency,
      languageCode: data.language,
      status: 'draft',
      notes: data.notes,
    });
    this.byId.set(v.id, v);
    return Promise.resolve(v);
  }
  findByIdForOwner(eventId: string, ownerId: string): Promise<EventView | null> {
    const v = this.byId.get(eventId);
    return Promise.resolve(v && v.ownerId === ownerId ? v : null);
  }
  listByOwner(
    ownerId: string,
    _filters: EventListFilters,
    options: EventListOptions,
  ): Promise<{ items: EventView[]; total: number }> {
    const items = [...this.byId.values()].filter((v) => v.ownerId === ownerId);
    return Promise.resolve({ items, total: items.length + options.page * 0 });
  }
  update(eventId: string, patch: UpdateEventData): Promise<EventView> {
    const v = { ...this.byId.get(eventId)! };
    if (patch.name !== undefined) v.name = patch.name;
    if (patch.guestsCount !== undefined) v.guestsCount = patch.guestsCount;
    if (patch.notes !== undefined) v.notes = patch.notes;
    this.byId.set(eventId, v);
    return Promise.resolve(v);
  }
  transitionStatus(eventId: string, nextStatus: EventStatusValue): Promise<EventView> {
    const v = { ...this.byId.get(eventId)!, status: nextStatus };
    this.byId.set(eventId, v);
    return Promise.resolve(v);
  }
  softDelete(eventId: string): Promise<void> {
    this.byId.delete(eventId);
    return Promise.resolve();
  }
  findExpiredActive(): Promise<{ id: string; eventDate: Date }[]> {
    // US-015 helper: US-095 use cases no consumen este método; retorno vacío para satisfacer
    // el contrato del puerto sin acoplar los tests de US-095 a la lógica de auto-complete.
    return Promise.resolve([]);
  }
  markCompleted(): Promise<{ affected: number }> {
    return Promise.resolve({ affected: 0 });
  }
}

class FakeEventTypeRepo implements EventTypeRepository {
  active = new Set<string>(['wedding', 'birthday', 'corporate', 'xv', 'baptism', 'baby_shower']);
  findActiveIdByCode(code: string): Promise<string | null> {
    return Promise.resolve(this.active.has(code) ? `type-${code}` : null);
  }
  findActive(): Promise<{ code: string; label: string }[]> {
    return Promise.resolve([...this.active].map((code) => ({ code, label: code })));
  }
}
class FakeLocationRepo implements LocationRepository {
  existing = new Set<string>(['loc-1']);
  existsActive(id: string): Promise<boolean> {
    return Promise.resolve(this.existing.has(id));
  }
  listActive(): Promise<{ id: string; country: string; region: string | null; city: string | null }[]> {
    return Promise.resolve([...this.existing].map((id) => ({ id, country: 'GT', region: null, city: null })));
  }
}
class FakeAudit implements EventAuditLogger {
  emitted: EventAuditName[] = [];
  emit(event: EventAuditName): void {
    this.emitted.push(event);
  }
}

const validCreate = {
  eventTypeCode: 'wedding' as const,
  eventDate: '2026-12-31',
  guestsCount: 100,
  locationId: 'loc-1',
  estimatedBudget: '1000.00',
  currencyCode: 'GTQ' as const,
  languageCode: 'es-LATAM' as const,
};

describe('CreateEventUseCase (AC-01, EC-04)', () => {
  let events: FakeEventRepo;
  let audit: FakeAudit;
  let uc: CreateEventUseCase;
  beforeEach(() => {
    events = new FakeEventRepo();
    audit = new FakeAudit();
    uc = new CreateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit);
  });

  it('crea evento draft con autoCompleted=false y emite event.created', async () => {
    const v = await uc.execute('org-1', validCreate);
    expect(v.status).toBe('draft');
    expect(v.autoCompleted).toBe(false);
    expect(v.ownerId).toBe('org-1');
    expect(audit.emitted).toContain('event.created');
  });
  it('deriva un name por defecto cuando no se envía', async () => {
    const v = await uc.execute('org-1', validCreate);
    expect(v.name).toBe('Evento wedding');
  });
  it('location inexistente → NotFoundError (EC-04)', async () => {
    await expect(uc.execute('org-1', { ...validCreate, locationId: 'loc-x' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('UpdateEventUseCase (AC-04/AC-05, EC-03/EC-05)', () => {
  let events: FakeEventRepo;
  let uc: UpdateEventUseCase;
  beforeEach(() => {
    events = new FakeEventRepo();
    uc = new UpdateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), new FakeAudit());
  });

  it('currencyCode presente → CurrencyImmutableError (409, AC-05)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1' }));
    await expect(uc.execute('org-1', 'e-1', { currencyCode: 'EUR' })).rejects.toBeInstanceOf(CurrencyImmutableError);
  });
  it('evento de otro owner → NotFoundError (masked, EC-03)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-2' }));
    await expect(uc.execute('org-1', 'e-1', { name: 'x' })).rejects.toBeInstanceOf(NotFoundError);
  });
  it('estado terminal → BusinessRuleViolationError (EC-05)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'cancelled' }));
    await expect(uc.execute('org-1', 'e-1', { name: 'x' })).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
  it('actualiza campos permitidos', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1' }));
    const v = await uc.execute('org-1', 'e-1', { name: 'Renombrada', guestsCount: 250 });
    expect(v).toMatchObject({ name: 'Renombrada', guestsCount: 250 });
  });
});

describe('Activate/Cancel/Get (AC-06/AC-07/AC-03, EC-05)', () => {
  let events: FakeEventRepo;
  beforeEach(() => {
    events = new FakeEventRepo();
  });
  it('activate draft → active', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'draft' }));
    const v = await new ActivateEventUseCase(events, new FakeAudit()).execute('org-1', 'e-1');
    expect(v.status).toBe('active');
  });
  it('activate desde active → BusinessRuleViolationError', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'active' }));
    await expect(new ActivateEventUseCase(events, new FakeAudit()).execute('org-1', 'e-1')).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
  it('cancel active → cancelled', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'active' }));
    const v = await new CancelEventUseCase(events, new FakeAudit()).execute('org-1', 'e-1');
    expect(v.status).toBe('cancelled');
  });
  it('cancel completed → BusinessRuleViolationError', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'completed' }));
    await expect(new CancelEventUseCase(events, new FakeAudit()).execute('org-1', 'e-1')).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
  it('getById de evento inexistente/ajeno → NotFoundError', async () => {
    await expect(new GetEventByIdUseCase(events).execute('org-1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
