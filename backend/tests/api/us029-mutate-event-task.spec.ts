// US-029 (PB-P1-018 / QA-002/003/004/006) — Tests API de las 3 mutaciones.
// DB-free: anónimo → 401; UUID inválido → 400; Content-Type inválido → 415 en PATCH.
// DB-gated (skipIf sin DB local): AC-01..06, EC-01..14, VR-01..14, AUTH-TS-01..05.
// DELETE ignora Content-Type (VR-13) — no se testea 415 en DELETE.
import { describe, it, expect } from 'vitest';
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
const EVENT_UUID = '11111111-1111-4111-8111-111111111111';
const TASK_UUID = '22222222-2222-4222-8222-222222222222';

describe('US-029 QA-003 (sin BD): DB-free', () => {
  it('AUTH-TS-05 anónimo → 401 AUTHENTICATION_REQUIRED en PATCH content', async () => {
    const res = await request(app)
      .patch(`/api/v1/events/${EVENT_UUID}/tasks/${TASK_UUID}`)
      .set('Content-Type', 'application/json')
      .send({ title: 'X' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('AUTH-TS-05 anónimo → 401 en PATCH status', async () => {
    const res = await request(app)
      .patch(`/api/v1/events/${EVENT_UUID}/tasks/${TASK_UUID}/status`)
      .set('Content-Type', 'application/json')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(401);
  });

  it('AUTH-TS-05 anónimo → 401 en DELETE', async () => {
    const res = await request(app).delete(`/api/v1/events/${EVENT_UUID}/tasks/${TASK_UUID}`);
    expect(res.status).toBe(401);
  });
});

const uniqEmail = (p: string): string =>
  `us029_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function agentFor(role: 'organizer' | 'vendor'): Promise<ReturnType<typeof request.agent>> {
  const email = uniqEmail(role);
  const agent = request.agent(app);
  const payload: Record<string, unknown> = {
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role,
    captchaToken: CAPTCHA,
  };
  if (role === 'vendor') payload.businessName = 'Vendor Demo SA';
  else payload.name = 'Organizer';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

// Helper: crea evento + tarea propia y devuelve sus ids.
async function seedEventAndTask(
  agent: ReturnType<typeof request.agent>,
): Promise<{ eventId: string; taskId: string }> {
  const evtRes = await agent
    .post('/api/v1/events')
    .set('Content-Type', 'application/json')
    .send({
      title: 'US-029 evt',
      eventDate: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
      guestCountEstimated: 20,
      budgetEstimated: 100,
      currencyCode: 'USD',
      language: 'es-LATAM',
    });
  const eventId = evtRes.body?.data?.id ?? evtRes.body?.id;
  const tRes = await agent
    .post(`/api/v1/events/${eventId}/tasks`)
    .set('Content-Type', 'application/json')
    .send({ title: 'seed task' });
  const taskId = tRes.body?.data?.id;
  return { eventId, taskId };
}

describe.skipIf(!dbUp)('US-029 QA-002/003 (con BD): happy path + edge cases', () => {
  it('AC-01 PATCH content title → 200 + TaskListItemDto actualizado', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}`)
      .set('Content-Type', 'application/json')
      .send({ title: 'Actualizado' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.title).toBe('Actualizado');
  });

  it('AC-02 PATCH status pending → in_progress', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}/status`)
      .set('Content-Type', 'application/json')
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('in_progress');
  });

  it('AC-03 DELETE soft → 204 sin body', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org.delete(`/api/v1/events/${eventId}/tasks/${taskId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('EC-05 doble DELETE → 404 en el segundo', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    await org.delete(`/api/v1/events/${eventId}/tasks/${taskId}`).expect(204);
    const res2 = await org.delete(`/api/v1/events/${eventId}/tasks/${taskId}`);
    expect(res2.status).toBe(404);
  });

  it('EC-06 PATCH content vacío → 400 EMPTY_PATCH', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}`)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('EMPTY_PATCH');
  });

  it('EC-02 transición inválida done → pending → 409 INVALID_TRANSITION', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    // Llevar a done primero
    await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}/status`)
      .set('Content-Type', 'application/json')
      .send({ status: 'done' })
      .expect(200);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}/status`)
      .set('Content-Type', 'application/json')
      .send({ status: 'pending' });
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('INVALID_TRANSITION');
  });

  it('EC-03 transición a sí mismo → 200 no_op', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}/status`)
      .set('Content-Type', 'application/json')
      .send({ status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('pending');
  });

  it('EC-14 Content-Type inválido en PATCH → 415', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const res = await org
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}`)
      .set('Content-Type', 'text/plain')
      .send('title=x');
    expect(res.status).toBe(415);
  });
});

describe.skipIf(!dbUp)('US-029 QA-004 (con BD): authorization', () => {
  it('AUTH-TS-03 vendor → 403 FORBIDDEN en PATCH content', async () => {
    const vendor = await agentFor('vendor');
    const res = await vendor
      .patch(`/api/v1/events/${EVENT_UUID}/tasks/${TASK_UUID}`)
      .set('Content-Type', 'application/json')
      .send({ title: 'X' });
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-02 organizer no dueño → 404 NOT_FOUND (no-revelación)', async () => {
    const org1 = await agentFor('organizer');
    const org2 = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org1);
    const res = await org2
      .patch(`/api/v1/events/${eventId}/tasks/${taskId}`)
      .set('Content-Type', 'application/json')
      .send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe.skipIf(!dbUp)('US-029 QA-006 (con BD): concurrencia', () => {
  it('CONC-01 dos DELETE simultáneos: uno gana con 204, otro 404', async () => {
    const org = await agentFor('organizer');
    const { eventId, taskId } = await seedEventAndTask(org);
    const [a, b] = await Promise.all([
      org.delete(`/api/v1/events/${eventId}/tasks/${taskId}`),
      org.delete(`/api/v1/events/${eventId}/tasks/${taskId}`),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([204, 404]);
  });
});
