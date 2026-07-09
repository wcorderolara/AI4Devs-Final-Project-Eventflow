// US-095 / QA-003 — Security negative tests de Event API. AC-02/03/04/05/08; §12.
// DB-free: anonymous → 401; ruta admin ausente → 404. DB-gated (skipIf): vendor → 403,
// cross-owner → 404 masked, campos prohibidos → 400, rutas status/delete ausentes → 404.
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
const uniqEmail = (p: string): string => `us095sec_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;
const SOME_UUID = '11111111-1111-4111-8111-111111111111';

async function agentFor(role: 'organizer' | 'vendor'): Promise<ReturnType<typeof request.agent>> {
  const email = uniqEmail(role);
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: role, role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('QA-003 (sin BD): anonymous y rutas fuera de scope', () => {
  it('EC-01/NT-01: anonymous → 401 en endpoints Event', async () => {
    expect((await request(app).get('/api/v1/events')).status).toBe(401);
    expect((await request(app).post('/api/v1/events').send({})).status).toBe(401);
    expect((await request(app).get(`/api/v1/events/${SOME_UUID}`)).status).toBe(401);
  });

  it('scope: `/api/v1/admin/events` no existe → 404', async () => {
    const res = await request(app).get('/api/v1/admin/events');
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!dbUp)('QA-003 (con BD): role, ownership y campos prohibidos', () => {
  let locationId = '';
  const body = (): Record<string, unknown> => ({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 100,
    locationId,
    estimatedBudget: '1000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE events, sessions, password_reset_tokens, users, event_types, locations RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
  });

  it('EC-02/NT-02: vendor → 403 al crear evento', async () => {
    const vendor = await agentFor('vendor');
    const res = await vendor.post('/api/v1/events').send(body());
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('EC-03/NT-03/NT-04: cross-owner detail/patch/activate → 404 masked, sin cambio', async () => {
    const orgA = await agentFor('organizer');
    const orgB = await agentFor('organizer');
    const created = await orgA.post('/api/v1/events').send(body());
    const id = created.body.data.id as string;

    expect((await orgB.get(`/api/v1/events/${id}`)).status).toBe(404);
    expect((await orgB.patch(`/api/v1/events/${id}`).send({ name: 'hack' })).status).toBe(404);
    expect((await orgB.post(`/api/v1/events/${id}/activate`)).status).toBe(404);

    // El evento de A no cambió.
    const stillDraft = await orgA.get(`/api/v1/events/${id}`);
    expect(stillDraft.body.data).toMatchObject({ name: created.body.data.name, status: 'draft' });
  });

  it('NT-12: PATCH con campos no editables (status/ownerId/autoCompleted) → 400', async () => {
    const org = await agentFor('organizer');
    const created = await org.post('/api/v1/events').send(body());
    const id = created.body.data.id as string;
    for (const bad of [{ status: 'active' }, { ownerId: SOME_UUID }, { autoCompleted: true }]) {
      const res = await org.patch(`/api/v1/events/${id}`).send(bad);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('scope: `POST /events/:id/status` y `DELETE /events/:id` no existen → 404 (autenticado)', async () => {
    const org = await agentFor('organizer');
    expect((await org.post(`/api/v1/events/${SOME_UUID}/status`).send({ status: 'active' })).status).toBe(404);
    expect((await org.delete(`/api/v1/events/${SOME_UUID}`)).status).toBe(404);
  });
});
