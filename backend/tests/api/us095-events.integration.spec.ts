// US-095 / QA-002 — Integration/API tests (Supertest + Prisma test DB). AC-01..AC-08.
// Crea fixtures factory (EventType/Location activos) porque el repo no tiene seed. Usa la sesión
// autenticada de US-094 (cookie). Skip limpio sin BD (patrón `describe.skipIf(!dbUp)`).
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const CAPTCHA = '__test__';
const uniqEmail = (p: string): string => `us095_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

/** Registra + loguea un organizer y devuelve un agente Supertest con la cookie de sesión. */
async function organizerAgent(): Promise<ReturnType<typeof request.agent>> {
  const email = uniqEmail('org');
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'Org', role: 'organizer', captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

let locationId = '';
function validEventBody(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 120,
    locationId,
    estimatedBudget: '15000.50',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
    name: 'Boda de prueba',
    ...over,
  };
}

describe.skipIf(!dbUp)('US-095 QA-002 — Event API integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE events, sessions, password_reset_tokens, users, event_types, locations RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    await prisma.eventType.create({ data: { code: 'birthday', label: 'Birthday', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
  });

  it('AC-01: organizer crea evento → 201 draft, autoCompleted=false, meta.correlationId', async () => {
    const agent = await organizerAgent();
    const res = await agent.post('/api/v1/events').send(validEventBody());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'draft',
      autoCompleted: false,
      eventTypeCode: 'wedding',
      currencyCode: 'GTQ',
      guestsCount: 120,
    });
    expect(res.body.data.completedAt).toBeNull();
    expect(typeof res.body.meta.correlationId).toBe('string');
  });

  it('AC-02: list solo eventos propios con pagination meta', async () => {
    const agent = await organizerAgent();
    await agent.post('/api/v1/events').send(validEventBody({ name: 'A' }));
    await agent.post('/api/v1/events').send(validEventBody({ name: 'B', eventTypeCode: 'birthday' }));
    const res = await agent.get('/api/v1/events?pageSize=10');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 10, total: 2, totalPages: 1 });
    // Filtro por tipo.
    const filtered = await agent.get('/api/v1/events?eventTypeCode=birthday');
    expect(filtered.body.data.every((e: { eventTypeCode: string }) => e.eventTypeCode === 'birthday')).toBe(true);
  });

  it('AC-03: get detail propio → 200', async () => {
    const agent = await organizerAgent();
    const created = await agent.post('/api/v1/events').send(validEventBody());
    const id = created.body.data.id as string;
    const res = await agent.get(`/api/v1/events/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('AC-04: PATCH actualiza campos editables (no currency)', async () => {
    const agent = await organizerAgent();
    const created = await agent.post('/api/v1/events').send(validEventBody());
    const id = created.body.data.id as string;
    const res = await agent.patch(`/api/v1/events/${id}`).send({ name: 'Renombrada', guestsCount: 300, notes: 'nota' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Renombrada', guestsCount: 300, notes: 'nota', currencyCode: 'GTQ' });
  });

  it('AC-05/NT-08: PATCH con currencyCode → 409 CURRENCY_IMMUTABLE, sin cambio', async () => {
    const agent = await organizerAgent();
    const created = await agent.post('/api/v1/events').send(validEventBody());
    const id = created.body.data.id as string;
    const res = await agent.patch(`/api/v1/events/${id}`).send({ currencyCode: 'EUR' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CURRENCY_IMMUTABLE');
    const after = await agent.get(`/api/v1/events/${id}`);
    expect(after.body.data.currencyCode).toBe('GTQ');
  });

  it('AC-06/AC-07: activate draft→active, cancel→cancelled; transición inválida → 422', async () => {
    const agent = await organizerAgent();
    const created = await agent.post('/api/v1/events').send(validEventBody());
    const id = created.body.data.id as string;

    const act = await agent.post(`/api/v1/events/${id}/activate`);
    expect(act.status).toBe(200);
    expect(act.body.data.status).toBe('active');

    // Reactivar un evento ya activo → 422 BUSINESS_RULE_VIOLATION (EC-05, NT-09).
    const reAct = await agent.post(`/api/v1/events/${id}/activate`);
    expect(reAct.status).toBe(422);
    expect(reAct.body.error.code).toBe('BUSINESS_RULE_VIOLATION');

    const cancel = await agent.post(`/api/v1/events/${id}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');

    // Cancelar un evento ya cancelado → 422 (NT-10).
    const reCancel = await agent.post(`/api/v1/events/${id}/cancel`);
    expect(reCancel.status).toBe(422);
  });

  it('EC-04: locationId inexistente → 404', async () => {
    const agent = await organizerAgent();
    const res = await agent.post('/api/v1/events').send(validEventBody({ locationId: '99999999-9999-4999-8999-999999999999' }));
    expect(res.status).toBe(404);
  });
});
