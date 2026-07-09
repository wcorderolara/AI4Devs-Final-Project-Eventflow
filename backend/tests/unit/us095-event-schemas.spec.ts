// US-095 / QA-001 — Unit tests de DTOs y lifecycle de Event (sin BD). AC-01/02/04/05/06/07; VR.
import { describe, it, expect } from 'vitest';
import {
  CreateEventRequestSchema,
  UpdateEventRequestSchema,
  ListEventsQuerySchema,
  EventIdParamSchema,
} from '../../src/modules/event-planning/dto/index.js';
import {
  canActivate,
  canCancel,
  isMutable,
} from '../../src/modules/event-planning/domain/event-lifecycle.js';

const validCreate = {
  eventTypeCode: 'wedding',
  eventDate: '2026-12-31',
  guestsCount: 120,
  locationId: '11111111-1111-4111-8111-111111111111',
  estimatedBudget: '15000.50',
  currencyCode: 'GTQ',
  languageCode: 'es-LATAM',
};

describe('CreateEventRequestSchema (AC-01, VR-01..VR-08)', () => {
  it('acepta un payload válido', () => {
    expect(CreateEventRequestSchema.safeParse(validCreate).success).toBe(true);
  });
  it('rechaza eventTypeCode no soportado (VR-01)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, eventTypeCode: 'gala' }).success).toBe(false);
  });
  it('rechaza eventDate con formato inválido (VR-02)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, eventDate: '31-12-2026' }).success).toBe(false);
  });
  it('rechaza guestsCount < 1 (VR-03)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, guestsCount: 0 }).success).toBe(false);
  });
  it('rechaza estimatedBudget negativo/no decimal (VR-05)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, estimatedBudget: '-5' }).success).toBe(false);
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, estimatedBudget: 'abc' }).success).toBe(false);
  });
  it('rechaza currencyCode/languageCode no soportados (VR-06, VR-08)', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, currencyCode: 'BTC' }).success).toBe(false);
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, languageCode: 'fr' }).success).toBe(false);
  });
  it('rechaza campos desconocidos (.strict())', () => {
    expect(CreateEventRequestSchema.safeParse({ ...validCreate, status: 'active' }).success).toBe(false);
  });
});

describe('UpdateEventRequestSchema (AC-04/AC-05, VR-07, VR-09)', () => {
  it('acepta campos editables', () => {
    expect(UpdateEventRequestSchema.safeParse({ name: 'Nueva boda', guestsCount: 200 }).success).toBe(true);
  });
  it('ACEPTA currencyCode en el schema (el use case produce 409, no 400)', () => {
    expect(UpdateEventRequestSchema.safeParse({ currencyCode: 'EUR' }).success).toBe(true);
  });
  it('rechaza campos no editables por strict (status/ownerId/autoCompleted)', () => {
    expect(UpdateEventRequestSchema.safeParse({ status: 'active' }).success).toBe(false);
    expect(UpdateEventRequestSchema.safeParse({ ownerId: 'x' }).success).toBe(false);
    expect(UpdateEventRequestSchema.safeParse({ autoCompleted: true }).success).toBe(false);
  });
  it('rechaza payload vacío (≥1 campo)', () => {
    expect(UpdateEventRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe('ListEventsQuerySchema (AC-02, VR-10, EC-06)', () => {
  it('aplica defaults (page 1, pageSize 20, sort eventDate:asc)', () => {
    const r = ListEventsQuerySchema.parse({});
    expect(r).toMatchObject({ page: 1, pageSize: 20, sort: 'eventDate:asc' });
  });
  it('coacciona numéricos desde string y acota pageSize', () => {
    expect(ListEventsQuerySchema.safeParse({ page: '2', pageSize: '50' }).success).toBe(true);
    expect(ListEventsQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
  it('rechaza sort inválido y status/tipo inválidos', () => {
    expect(ListEventsQuerySchema.safeParse({ sort: 'name:asc' }).success).toBe(false);
    expect(ListEventsQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});

describe('EventIdParamSchema', () => {
  it('rechaza un eventId no-UUID', () => {
    expect(EventIdParamSchema.safeParse({ eventId: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('EventLifecycle (AC-06/AC-07, EC-05)', () => {
  it('activate solo desde draft', () => {
    expect(canActivate('draft')).toBe(true);
    expect(canActivate('active')).toBe(false);
    expect(canActivate('completed')).toBe(false);
  });
  it('cancel desde no-terminal', () => {
    expect(canCancel('draft')).toBe(true);
    expect(canCancel('active')).toBe(true);
    expect(canCancel('cancelled')).toBe(false);
    expect(canCancel('completed')).toBe(false);
  });
  it('mutable solo en no-terminal', () => {
    expect(isMutable('draft')).toBe(true);
    expect(isMutable('cancelled')).toBe(false);
  });
});
