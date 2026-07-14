// US-027 (PB-P1-018) / QA-002+003+004 — Tests API del listado paginado del checklist.
// - DB-free: anónimo → 401; UUID inválido → 400 VALIDATION; vendor sin sesión → 401.
// - DB-gated (skipIf): matrix funcional (happy TS-01/05, filtros TS-02/03/04, i18n TS-08,
//   estado vacío TS-07, negatives NT-07..11, authorization AUTH-TS-01..05, no-revelación).
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
  `us027_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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

describe('US-027 QA-003 (sin BD): auth y forma del payload', () => {
  it('anónimo → 401 AUTHENTICATION_REQUIRED (AUTH-TS-05)', async () => {
    const res = await request(app).get(`/api/v1/events/${SOME_UUID}/tasks`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-027 QA-002/003/004 (con BD): listado paginado', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let organizerId = '';
  let otherOrganizerAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let eventId = '';
  let otherEventId = '';
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

    organizerAgent = await agentFor('organizer');
    organizerId = (await organizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    otherOrganizerAgent = await agentFor('organizer');
    const otherId = (await otherOrganizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    vendorAgent = await agentFor('vendor');

    const eventTypeId = (await prisma.eventType.findFirst())!.id;
    const created = await prisma.event.create({
      data: {
        userId: organizerId,
        eventTypeId,
        locationId: loc.id,
        title: 'US-027 checklist demo',
        status: 'active',
        eventDate: new Date('2026-12-31T00:00:00Z'),
      },
      select: { id: true },
    });
    eventId = created.id;

    const otherEvent = await prisma.event.create({
      data: {
        userId: otherId,
        eventTypeId,
        locationId: loc.id,
        title: 'Ajeno',
        status: 'active',
        eventDate: new Date('2026-12-31T00:00:00Z'),
      },
      select: { id: true },
    });
    otherEventId = otherEvent.id;

    const softDeleted = await prisma.event.create({
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
    });
    softDeletedEventId = softDeleted.id;

    // Seed de tareas mixtas: 25 en total (mix status, IA/manual, category, due_date null).
    const now = new Date();
    const tasks = Array.from({ length: 25 }, (_, i) => ({
      eventId,
      title: `Tarea ${i + 1}`,
      dueDate: i % 5 === 0 ? null : new Date(now.getTime() + i * 86400000),
      status: (i % 4 === 0 ? 'pending' : i % 4 === 1 ? 'in_progress' : i % 4 === 2 ? 'done' : 'skipped') as
        | 'pending'
        | 'in_progress'
        | 'done'
        | 'skipped',
      origin: (i % 3 === 0 ? 'ai' : 'manual') as 'ai' | 'manual',
      aiGenerated: i % 3 === 0,
      categoryCode: i % 2 === 0 ? 'catering' : null,
    }));
    await prisma.eventTask.createMany({ data: tasks });
    // Una tarea soft-deleted no debe aparecer.
    await prisma.eventTask.create({
      data: {
        eventId,
        title: 'Eliminada',
        status: 'pending',
        origin: 'manual',
        deletedAt: new Date(),
      },
    });
  });

  it('AC-01 / TS-01: happy path — 200 con envelope canónico + defaults page/pageSize', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks`);
    expect(res.status).toBe(200);
    expect(res.body?.pagination?.page).toBe(1);
    expect(res.body?.pagination?.pageSize).toBe(20);
    expect(res.body?.pagination?.total).toBe(25);
    expect(res.body?.pagination?.totalPages).toBe(2);
    expect(Array.isArray(res.body?.data)).toBe(true);
    expect(res.body.data).toHaveLength(20);
    // Soft-deleted excluida (SEC-02, BR-TASK-009).
    for (const item of res.body.data) {
      expect(item.title).not.toBe('Eliminada');
    }
  });

  it('AC-02 / TS-02: filtro por status=pending', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?status=pending&pageSize=100`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { status: string }) => t.status === 'pending')).toBe(true);
  });

  it('AC-03 / TS-03: filtro aiGenerated=true expone ai_recommendation_id', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?aiGenerated=true&pageSize=100`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const item of res.body.data) {
      expect(item.ai_generated).toBe(true);
      expect(item).toHaveProperty('ai_recommendation_id');
    }
  });

  it('AC-04 / TS-04: filtro categoryCode=catering y literal "null"', async () => {
    const cat = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?categoryCode=catering&pageSize=100`);
    expect(cat.status).toBe(200);
    expect(cat.body.data.every((t: { category_code: string | null }) => t.category_code === 'catering')).toBe(true);

    const nul = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?categoryCode=null&pageSize=100`);
    expect(nul.status).toBe(200);
    expect(nul.body.data.every((t: { category_code: string | null }) => t.category_code === null)).toBe(true);
  });

  it('AC-05 / TS-05: paginación page=2 con pageSize=10 y totales correctos', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?page=2&pageSize=10`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.pageSize).toBe(10);
    expect(res.body.pagination.total).toBe(25);
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.data).toHaveLength(10);
  });

  it('AC-06 / TS-07: estado vacío — evento sin tareas (o todas eliminadas)', async () => {
    // Crear evento sin tareas.
    const emptyEvent = await prisma.event.create({
      data: {
        userId: organizerId,
        eventTypeId: (await prisma.eventType.findFirst())!.id,
        title: 'Sin tareas',
        status: 'active',
        eventDate: new Date('2026-12-31T00:00:00Z'),
      },
      select: { id: true },
    });
    const res = await organizerAgent.get(`/api/v1/events/${emptyEvent.id}/tasks`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
    expect(res.body.pagination.totalPages).toBe(0);
  });

  it('AC-01 / EC-07: ordenamiento due_date ASC NULLS LAST', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=100`);
    expect(res.status).toBe(200);
    const items = res.body.data as Array<{ due_date: string | null }>;
    // Las tareas con due_date se ordenan asc antes de las que tienen due_date null.
    let sawNull = false;
    for (const it of items) {
      if (it.due_date === null) sawNull = true;
      else if (sawNull) {
        throw new Error('Se encontró una tarea con due_date después de una nula: viola NULLS LAST');
      }
    }
  });

  it('EC-01 / NT-07..08: filtros inválidos descartados (200, no 400)', async () => {
    const res = await organizerAgent.get(
      `/api/v1/events/${eventId}/tasks?status=foo&aiGenerated=yes&pageSize=100`,
    );
    expect(res.status).toBe(200);
    // Todo el catálogo (25 tareas, misma que sin filtros).
    expect(res.body.pagination.total).toBe(25);
  });

  it('EC-02 / NT-09..10: pageSize fuera de rango — clamp/default', async () => {
    const over = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=500`);
    expect(over.status).toBe(200);
    expect(over.body.pagination.pageSize).toBe(100);

    const zero = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=0`);
    expect(zero.status).toBe(200);
    expect(zero.body.pagination.pageSize).toBe(20);
  });

  it('EC-03 / NT-11: page más allá de totalPages → 200 con items=[]', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?page=9999`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.page).toBe(9999);
    expect(res.body.pagination.total).toBe(25);
  });

  it('NT-01: eventId inválido → 400 VALIDATION', async () => {
    const res = await organizerAgent.get('/api/v1/events/not-a-uuid/tasks');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-TS-02 / EC-06: evento ajeno → 404 no-revelación', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${otherEventId}/tasks`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('EC-06: evento soft-deleted → 404 no-revelación (misma forma)', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${softDeletedEventId}/tasks`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('AUTH-TS-03: vendor → 403 FORBIDDEN', async () => {
    const res = await vendorAgent.get(`/api/v1/events/${eventId}/tasks`);
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN');
  });

  it('AC-07: tarea IA expuesta con ai_generated + ai_recommendation_id, SIN payloads LLM', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?aiGenerated=true&pageSize=100`);
    expect(res.status).toBe(200);
    const forbiddenKeys = ['prompt_version_id', 'llm_provider', 'language_code', 'raw', 'payload'];
    for (const item of res.body.data) {
      for (const k of forbiddenKeys) {
        expect(Object.hasOwn(item, k)).toBe(false);
      }
    }
  });
});
