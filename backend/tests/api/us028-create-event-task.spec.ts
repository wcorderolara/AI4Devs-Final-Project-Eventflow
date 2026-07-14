// US-028 (PB-P1-018) / QA-002+003+004 — Tests API del endpoint POST /events/:eventId/tasks.
// DB-free: anónimo → 401; UUID inválido → 400; Content-Type inválido → 415.
// DB-gated (skipIf sin DB local): happy paths TS-01..07, negatives NT-07..19 y AUTH-TS-01..05.
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
const SOME_UUID = '11111111-1111-4111-8111-111111111111';
const uniqEmail = (p: string): string =>
  `us028_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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

describe('US-028 QA-003 (sin BD): DB-free', () => {
  it('AUTH-TS-05 anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${SOME_UUID}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x' });
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-028 QA-002/003/004 (con BD): creación manual', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let organizerId = '';
  let otherOrganizerAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let eventId = '';
  let otherEventId = '';
  let cancelledEventId = '';
  let softDeletedEventId = '';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE event_tasks, ai_recommendations, ai_prompt_versions, events, sessions, password_reset_tokens, users, event_types, locations, service_categories RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({
      data: { code: 'wedding', label: 'Wedding', isActive: true },
    });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    await prisma.serviceCategory.create({
      data: { code: 'catering', label: 'Catering', isActive: true, depthLevel: 1 },
    });
    await prisma.serviceCategory.create({
      data: { code: 'inactive-cat', label: 'Inactiva', isActive: false, depthLevel: 1 },
    });

    organizerAgent = await agentFor('organizer');
    organizerId = (await organizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    otherOrganizerAgent = await agentFor('organizer');
    const otherId = (await otherOrganizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    vendorAgent = await agentFor('vendor');

    const eventTypeId = (await prisma.eventType.findFirst())!.id;

    eventId = (
      await prisma.event.create({
        data: {
          userId: organizerId,
          eventTypeId,
          locationId: loc.id,
          title: 'US-028 checklist demo',
          status: 'active',
          eventDate: new Date('2026-12-31T00:00:00Z'),
        },
        select: { id: true },
      })
    ).id;

    otherEventId = (
      await prisma.event.create({
        data: {
          userId: otherId,
          eventTypeId,
          locationId: loc.id,
          title: 'Ajeno',
          status: 'active',
          eventDate: new Date('2026-12-31T00:00:00Z'),
        },
        select: { id: true },
      })
    ).id;

    cancelledEventId = (
      await prisma.event.create({
        data: {
          userId: organizerId,
          eventTypeId,
          locationId: loc.id,
          title: 'Cancelado',
          status: 'cancelled',
          eventDate: new Date('2026-12-31T00:00:00Z'),
        },
        select: { id: true },
      })
    ).id;

    softDeletedEventId = (
      await prisma.event.create({
        data: {
          userId: organizerId,
          eventTypeId,
          locationId: loc.id,
          title: 'Soft-deleted',
          status: 'draft',
          eventDate: new Date('2026-12-31T00:00:00Z'),
          deletedAt: new Date(),
        },
        select: { id: true },
      })
    ).id;
  });

  it('TS-01: solo title → 201 + defaults canónicos + header Location', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'Reservar el salón' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/v1/events/${eventId}/tasks/${res.body?.data?.id}`);
    expect(res.body?.data?.title).toBe('Reservar el salón');
    expect(res.body?.data?.status).toBe('pending');
    expect(res.body?.data?.ai_generated).toBe(false);
    expect(res.body?.data?.ai_recommendation_id).toBe(null);
    expect(res.body?.data?.category_code).toBe(null);
    expect(res.body?.data?.due_date).toBe(null);
    expect(res.body?.data?.confirmed_at).toBe(null);
  });

  it('TS-02: todos los campos → 201 con valores persistidos', async () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Confirmar menú con proveedor',
        description: 'Llamar el lunes 09:00',
        due_date: future,
        category_code: 'catering',
      });
    expect(res.status).toBe(201);
    expect(res.body?.data?.category_code).toBe('catering');
    expect(res.body?.data?.due_date).not.toBe(null);
  });

  it('TS-03/04: category_code=null y description=null explícitos persisten como null', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'Sin categoría', description: null, category_code: null });
    expect(res.status).toBe(201);
    expect(res.body?.data?.category_code).toBe(null);
  });

  it('TS-05/06: server-controlled + keys extras se descartan silenciosamente', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'X',
        ai_generated: true,
        ai_recommendation_id: '99999999-9999-4999-8999-999999999999',
        status: 'done',
        id: SOME_UUID,
        priority: 'high',
        tags: ['a', 'b'],
      });
    expect(res.status).toBe(201);
    expect(res.body?.data?.ai_generated).toBe(false);
    expect(res.body?.data?.status).toBe('pending');
    expect(res.body?.data?.ai_recommendation_id).toBe(null);
    expect(res.body?.data?.id).not.toBe(SOME_UUID);
  });

  it('NT-02: sin title → 400 VALIDATION', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-04/05: title fuera de rango 2..200 → 400 VALIDATION', async () => {
    const tooShort = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'X' });
    expect(tooShort.status).toBe(400);

    const tooLong = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'a'.repeat(201) });
    expect(tooLong.status).toBe(400);
  });

  it('NT-07: due_date en el pasado → 400 con message DUE_DATE_IN_PAST', async () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString();
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x', due_date: past });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    // details.message contiene el literal DUE_DATE_IN_PAST
    const details = res.body?.error?.details as Array<{ field: string; message: string }>;
    expect(details?.some((d) => d.message === 'DUE_DATE_IN_PAST')).toBe(true);
  });

  it('NT-08: due_date formato inválido → 400 VALIDATION', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x', due_date: 'mañana' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-09/10: category_code inexistente o inactiva → 400 CATEGORY_NOT_AVAILABLE', async () => {
    const inexistent = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x', category_code: 'inventada' });
    expect(inexistent.status).toBe(400);
    expect(inexistent.body?.error?.code).toBe('CATEGORY_NOT_AVAILABLE');

    const inactive = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x', category_code: 'inactive-cat' });
    expect(inactive.status).toBe(400);
    expect(inactive.body?.error?.code).toBe('CATEGORY_NOT_AVAILABLE');
  });

  it('NT-11: evento cancelled → 409 EVENT_NOT_MUTABLE', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${cancelledEventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('EVENT_NOT_MUTABLE');
  });

  it('NT-13: evento soft-deleted → 404 (no-revelación)', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${softDeletedEventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x' });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('AUTH-TS-02 / NT-14: evento ajeno → 404', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${otherEventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  it('AUTH-TS-03: vendor → 403 FORBIDDEN', async () => {
    const res = await vendorAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'application/json')
      .send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN');
  });

  it('NT-18: Content-Type no JSON → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventId}/tasks`)
      .set('Content-Type', 'text/plain')
      .send('title=x');
    expect(res.status).toBe(415);
    expect(res.body?.error?.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('CONC-02: doble POST con mismo body → dos ids distintos', async () => {
    const [a, b] = await Promise.all([
      organizerAgent
        .post(`/api/v1/events/${eventId}/tasks`)
        .set('Content-Type', 'application/json')
        .send({ title: 'Conc test' }),
      organizerAgent
        .post(`/api/v1/events/${eventId}/tasks`)
        .set('Content-Type', 'application/json')
        .send({ title: 'Conc test' }),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body?.data?.id).not.toBe(b.body?.data?.id);
  });
});
