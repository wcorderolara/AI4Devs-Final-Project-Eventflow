// US-082 / QA-001 — Unit tests del refactor `event.languageCode`. Cubre:
//   AC-01 default heredado desde `organizer.preferredLanguage`.
//   AC-02 override explícito en body.
//   AC-04 inmutabilidad en `completed`/`cancelled` → 409 EVENT_LANGUAGE_NOT_EDITABLE.
//   EC-01 fallback `es-LATAM` cuando no hay body ni lookup ni preferencia.
//   EC-02 language inválido → schema falla (VR-01).
//   OBS `event.language.set` / `event.language.changed` / `event.language.not_editable_violation`.
//
// Reusa los fakes de US-095 (in-memory) — no imports de infraestructura ni BD.
import { beforeEach, describe, expect, it } from 'vitest';
import type {
  EventListFilters,
  EventListOptions,
  EventRepository,
  EventTypeRepository,
  LocationRepository,
} from '../../src/modules/event-planning/ports/event.repository.js';
import type { EventAuditLogger, EventAuditName } from '../../src/modules/event-planning/ports/event-audit-logger.js';
import type { OrganizerLanguageLookup } from '../../src/modules/event-planning/ports/organizer-language.lookup.js';
import type { CreateEventData, EventView, UpdateEventData } from '../../src/modules/event-planning/domain/event.js';
import type { EventStatusValue } from '../../src/modules/event-planning/domain/event-lifecycle.js';
import type { SupportedLanguage } from '../../src/shared/constants/languages.js';
import { CreateEventUseCase } from '../../src/modules/event-planning/application/create-event.use-case.js';
import { UpdateEventUseCase } from '../../src/modules/event-planning/application/update-event.use-case.js';
import { CreateEventRequestSchema } from '../../src/modules/event-planning/dto/index.js';
import { EventLanguageNotEditableError } from '../../src/shared/domain/errors/event-language-not-editable.error.js';
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
    _ownerId: string,
    _filters: EventListFilters,
    _options: EventListOptions,
  ): Promise<{ items: EventView[]; total: number }> {
    return Promise.resolve({ items: [], total: 0 });
  }
  update(eventId: string, patch: UpdateEventData): Promise<EventView> {
    const v = { ...this.byId.get(eventId)! };
    if (patch.language !== undefined) v.languageCode = patch.language;
    if (patch.name !== undefined) v.name = patch.name;
    this.byId.set(eventId, v);
    return Promise.resolve(v);
  }
  transitionStatus(eventId: string, nextStatus: EventStatusValue): Promise<EventView> {
    const v = { ...this.byId.get(eventId)!, status: nextStatus };
    this.byId.set(eventId, v);
    return Promise.resolve(v);
  }
  softDelete(): Promise<void> {
    return Promise.resolve();
  }
  findExpiredActive(): Promise<{ id: string; eventDate: Date }[]> {
    return Promise.resolve([]);
  }
  markCompleted(): Promise<{ affected: number }> {
    return Promise.resolve({ affected: 0 });
  }
}

class FakeEventTypeRepo implements EventTypeRepository {
  findActiveIdByCode(code: string): Promise<string | null> {
    return Promise.resolve(`type-${code}`);
  }
  findActive(): Promise<{ code: string; label: string }[]> {
    return Promise.resolve([]);
  }
}
class FakeLocationRepo implements LocationRepository {
  existsActive(_id: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  listActive(): Promise<{ id: string; country: string; region: string | null; city: string | null }[]> {
    return Promise.resolve([]);
  }
}
class FakeAudit implements EventAuditLogger {
  emitted: Array<{ name: EventAuditName; data: Record<string, unknown> }> = [];
  emit(event: EventAuditName, data: Record<string, unknown>): void {
    this.emitted.push({ name: event, data });
  }
  last(name: EventAuditName): Record<string, unknown> | undefined {
    return [...this.emitted].reverse().find((e) => e.name === name)?.data;
  }
}
class StubLookup implements OrganizerLanguageLookup {
  constructor(private readonly value: SupportedLanguage | null) {}
  findPreferredLanguage(): Promise<SupportedLanguage | null> {
    return Promise.resolve(this.value);
  }
}

// UC-level tests usan `loc-1` (fakes lo aceptan). DTO-level tests requieren un UUID válido.
const validCreate = {
  eventTypeCode: 'wedding' as const,
  eventDate: '2026-12-31',
  guestsCount: 100,
  locationId: 'loc-1',
  estimatedBudget: '1000.00',
  currencyCode: 'GTQ' as const,
};
const validCreateWithUuid = {
  ...validCreate,
  locationId: '11111111-1111-4111-8111-111111111111',
};

describe('US-082 — DTO CreateEventRequestSchema (BE-001)', () => {
  it('languageCode ahora es opcional (D3)', () => {
    expect(CreateEventRequestSchema.safeParse(validCreateWithUuid).success).toBe(true);
  });
  it('languageCode explícito válido pasa (AC-02)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreateWithUuid, languageCode: 'pt' }).success).toBe(true);
  });
  it('languageCode inválido falla (EC-02, VR-01)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreateWithUuid, languageCode: 'fr' }).success).toBe(false);
  });
});

describe('US-082 — CreateEventUseCase (BE-002)', () => {
  let events: FakeEventRepo;
  let audit: FakeAudit;

  beforeEach(() => {
    events = new FakeEventRepo();
    audit = new FakeAudit();
  });

  it('AC-02 body override: languageCode del body se usa y auditoría marca source=body', async () => {
    const uc = new CreateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit, new StubLookup('en'));
    const view = await uc.execute('org-1', { ...validCreate, languageCode: 'pt' });
    expect(view.languageCode).toBe('pt');
    expect(audit.last('event.language.set')).toMatchObject({ languageSource: 'body', toLanguage: 'pt' });
  });

  it('AC-01 default heredado: sin body, usa organizer.preferredLanguage (source=inherited)', async () => {
    const uc = new CreateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit, new StubLookup('en'));
    const view = await uc.execute('org-1', validCreate);
    expect(view.languageCode).toBe('en');
    expect(audit.last('event.language.set')).toMatchObject({ languageSource: 'inherited', toLanguage: 'en' });
  });

  it('EC-01 fallback: sin body, sin preferencia del organizer → es-LATAM (source=default)', async () => {
    const uc = new CreateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit, new StubLookup(null));
    const view = await uc.execute('org-1', validCreate);
    expect(view.languageCode).toBe('es-LATAM');
    expect(audit.last('event.language.set')).toMatchObject({ languageSource: 'default', toLanguage: 'es-LATAM' });
  });

  it('sin lookup inyectado: fallback es-LATAM (compatible con composición sin acceso a users)', async () => {
    const uc = new CreateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit);
    const view = await uc.execute('org-1', validCreate);
    expect(view.languageCode).toBe('es-LATAM');
    expect(audit.last('event.language.set')).toMatchObject({ languageSource: 'default' });
  });
});

describe('US-082 — UpdateEventUseCase (BE-003)', () => {
  let events: FakeEventRepo;
  let audit: FakeAudit;
  let uc: UpdateEventUseCase;

  beforeEach(() => {
    events = new FakeEventRepo();
    audit = new FakeAudit();
    uc = new UpdateEventUseCase(events, new FakeEventTypeRepo(), new FakeLocationRepo(), audit);
  });

  it('AC-03 estado editable: cambio de idioma persiste y emite event.language.changed', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'active', languageCode: 'es-LATAM' }));
    const view = await uc.execute('org-1', 'e-1', { languageCode: 'pt' });
    expect(view.languageCode).toBe('pt');
    expect(audit.last('event.language.changed')).toMatchObject({ fromLanguage: 'es-LATAM', toLanguage: 'pt' });
  });

  it('AC-03 no-op: mismo languageCode que el actual NO emite event.language.changed', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'active', languageCode: 'pt' }));
    await uc.execute('org-1', 'e-1', { languageCode: 'pt' });
    expect(audit.last('event.language.changed')).toBeUndefined();
  });

  it('AC-04 completed + languageCode → EventLanguageNotEditableError (409)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'completed' }));
    await expect(uc.execute('org-1', 'e-1', { languageCode: 'en' })).rejects.toBeInstanceOf(EventLanguageNotEditableError);
    expect(audit.last('event.language.not_editable_violation')).toMatchObject({ currentStatus: 'completed' });
  });

  it('AC-04 cancelled + languageCode → EventLanguageNotEditableError (409)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'cancelled' }));
    await expect(uc.execute('org-1', 'e-1', { languageCode: 'en' })).rejects.toBeInstanceOf(EventLanguageNotEditableError);
  });

  it('regresión: terminal SIN languageCode sigue devolviendo BusinessRuleViolationError (422)', async () => {
    events.seed(baseView({ id: 'e-1', ownerId: 'org-1', status: 'completed' }));
    await expect(uc.execute('org-1', 'e-1', { name: 'Renombrada' })).rejects.toBeInstanceOf(BusinessRuleViolationError);
  });
});
