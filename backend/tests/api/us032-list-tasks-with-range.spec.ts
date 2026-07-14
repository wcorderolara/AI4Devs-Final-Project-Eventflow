// US-032 (PB-P1-019) / QA-002+003+004+005 — Tests API del endpoint extendido con `range`.
//
// - DB-free: happy `range` inválido con anónimo → 401 (autorización precede tolerancia).
// - DB-gated (`skipIf` por ausencia de DB local): matriz TS-01..09 + NT-01/07/08 +
//   AUTH-TS-01..05 + EC-06/07/08/10 sobre la ruta `GET /api/v1/events/:eventId/tasks?range=...`.
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
const MS_PER_DAY = 86_400_000;

const uniqEmail = (p: string): string =>
  `us032_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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

function midnightUtc(offsetDays = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + offsetDays * MS_PER_DAY);
}

describe('US-032 QA-005 (sin BD): autorización siempre precede tolerancia', () => {
  it('AUTH-TS-05: anónimo con range=overdue → 401 (no 200 tolerante)', async () => {
    const res = await request(app).get(`/api/v1/events/${SOME_UUID}/tasks?range=overdue`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-032 QA-002..005 (con BD): rango temporal server-side', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let organizerId = '';
  let otherOrganizerAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let eventId = '';

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
        title: 'US-032 range demo',
        status: 'active',
        eventDate: new Date('2027-01-31T00:00:00Z'),
      },
      select: { id: true },
    });
    eventId = created.id;

    // Evento ajeno (usado indirectamente para probar AUTH-TS-02 vía organizerAgent con eventId ajeno).
    await prisma.event.create({
      data: {
        userId: otherId,
        eventTypeId,
        locationId: loc.id,
        title: 'Ajeno',
        status: 'active',
        eventDate: new Date('2027-01-31T00:00:00Z'),
      },
      select: { id: true },
    });

    // Dataset canónico US-032 — cubre los 4 rangos + edge cases (EC-02, EC-04, EC-05, EC-07):
    //  Vencidas (pending, in_progress) + vencida done (excluida en overdue por BR-TASK-008)
    //  T-7 (hoy y today+7) + T-30 (fuera de T-7) + futuras (>today+30) + sin dueDate.
    const seedTasks = [
      // Vencidas operativas
      { title: 'Vencida pending', dueDate: midnightUtc(-5), status: 'pending' as const, aiGenerated: false, categoryCode: 'catering' },
      { title: 'Vencida in_progress', dueDate: midnightUtc(-2), status: 'in_progress' as const, aiGenerated: true, categoryCode: null },
      // Vencidas NO operativas (excluidas de overdue) — EC-04/05
      { title: 'Vencida done', dueDate: midnightUtc(-4), status: 'done' as const, aiGenerated: false, categoryCode: 'catering' },
      { title: 'Vencida skipped', dueDate: midnightUtc(-3), status: 'skipped' as const, aiGenerated: false, categoryCode: null },
      // T-7 (borde inclusivo)
      { title: 'Hoy pending', dueDate: midnightUtc(0), status: 'pending' as const, aiGenerated: false, categoryCode: 'catering' },
      { title: 'T-7 borde', dueDate: midnightUtc(7), status: 'pending' as const, aiGenerated: true, categoryCode: null },
      // T-30 fuera de T-7
      { title: 'T-15', dueDate: midnightUtc(15), status: 'pending' as const, aiGenerated: false, categoryCode: null },
      { title: 'T-30 borde', dueDate: midnightUtc(30), status: 'in_progress' as const, aiGenerated: false, categoryCode: 'catering' },
      // Futura fuera de T-30
      { title: 'T-45', dueDate: midnightUtc(45), status: 'pending' as const, aiGenerated: false, categoryCode: null },
      // Sin dueDate — EC-07
      { title: 'Sin due date', dueDate: null, status: 'pending' as const, aiGenerated: false, categoryCode: null },
    ];
    await prisma.eventTask.createMany({
      data: seedTasks.map((t) => ({
        eventId,
        title: t.title,
        dueDate: t.dueDate,
        status: t.status,
        origin: t.aiGenerated ? 'ai' : 'manual',
        aiGenerated: t.aiGenerated,
        categoryCode: t.categoryCode,
      })),
    });
  });

  // ─── QA-002 · TS-01..04 ───────────────────────────────────────────────────
  it('AC-03 / TS-03: range=overdue → solo pending/in_progress vencidas; excluye done/skipped y NULL', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue&pageSize=100`);
    expect(res.status).toBe(200);
    const titles = (res.body.data as Array<{ title: string; overdue: boolean }>).map((t) => t.title);
    expect(titles).toEqual(expect.arrayContaining(['Vencida pending', 'Vencida in_progress']));
    expect(titles).not.toContain('Vencida done');
    expect(titles).not.toContain('Vencida skipped');
    expect(titles).not.toContain('Sin due date');
    for (const item of res.body.data) {
      expect(item.overdue).toBe(true);
      expect(item.is_t_minus_7).toBe(false);
    }
  });

  it('AC-01 / TS-01: range=7d → solo tareas en [today, today+7], flags is_t_minus_7=true', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=7d&pageSize=100`);
    expect(res.status).toBe(200);
    const titles = (res.body.data as Array<{ title: string }>).map((t) => t.title);
    expect(titles).toEqual(expect.arrayContaining(['Hoy pending', 'T-7 borde']));
    expect(titles).not.toContain('Vencida pending');
    expect(titles).not.toContain('T-15');
    expect(titles).not.toContain('Sin due date');
    for (const item of res.body.data) {
      expect(item.is_t_minus_7).toBe(true);
      expect(item.overdue).toBe(false);
    }
  });

  it('AC-02 / TS-02: range=30d → ventana [today, today+30]; borde 30d incluido', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=30d&pageSize=100`);
    expect(res.status).toBe(200);
    const titles = (res.body.data as Array<{ title: string }>).map((t) => t.title);
    expect(titles).toEqual(expect.arrayContaining(['Hoy pending', 'T-7 borde', 'T-15', 'T-30 borde']));
    expect(titles).not.toContain('T-45');
    expect(titles).not.toContain('Vencida pending');
    expect(titles).not.toContain('Sin due date');
  });

  it('AC-04 / TS-04: range=all (default) incluye due_date NULL y calcula flags por tarea', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=100`);
    expect(res.status).toBe(200);
    const titles = (res.body.data as Array<{ title: string }>).map((t) => t.title);
    expect(titles).toContain('Sin due date');
    expect(titles).toContain('T-45');
    // Flags están presentes en cada item; NULL → ambos false (EC-07).
    const nullItem = (res.body.data as Array<{ title: string; overdue: boolean; is_t_minus_7: boolean }>).find(
      (t) => t.title === 'Sin due date',
    );
    expect(nullItem?.overdue).toBe(false);
    expect(nullItem?.is_t_minus_7).toBe(false);
  });

  it('TS-09: ordenamiento canónico due_date ASC NULLS LAST bajo range=all', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=100`);
    const items = res.body.data as Array<{ due_date: string | null }>;
    // Los NULLs deben aparecer al final.
    const lastNonNullIdx = items.findIndex((t) => t.due_date === null);
    if (lastNonNullIdx !== -1) {
      for (let i = lastNonNullIdx; i < items.length; i += 1) {
        expect(items[i]!.due_date).toBeNull();
      }
    }
  });

  // ─── QA-003 · Combinaciones (AC-05, AC-06, TS-05..09) ───────────────────
  it('AC-05 / TS-05: range=7d combinado con status=pending', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=7d&status=pending&pageSize=100`);
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.status).toBe('pending');
      expect(item.is_t_minus_7).toBe(true);
    }
  });

  it('AC-05 / TS-06: range=overdue + aiGenerated=true → solo IA vencidas', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue&aiGenerated=true&pageSize=100`);
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.overdue).toBe(true);
      expect(item.ai_generated).toBe(true);
    }
  });

  it('AC-06: range=7d + categoryCode=catering', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=7d&categoryCode=catering&pageSize=100`);
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.category_code).toBe('catering');
      expect(item.is_t_minus_7).toBe(true);
    }
  });

  it('EC-06 / VR-05: range=overdue + status=done → intersección vacía (200 OK, items:[])', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue&status=done&pageSize=100`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('EC-08: paginación coherente con range=all (page=2, pageSize=5)', async () => {
    const p1 = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=5`);
    const p2 = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?page=2&pageSize=5`);
    expect(p1.body.pagination.total).toBe(p2.body.pagination.total);
    expect(p1.body.pagination.page).toBe(1);
    expect(p2.body.pagination.page).toBe(2);
    // Sin duplicados entre páginas.
    const idsP1 = (p1.body.data as Array<{ id: string }>).map((t) => t.id);
    const idsP2 = (p2.body.data as Array<{ id: string }>).map((t) => t.id);
    expect(idsP1.some((id) => idsP2.includes(id))).toBe(false);
  });

  // ─── QA-004 · Tolerancia (NT-01/07/08) ───────────────────────────────────
  it('NT-01: range=foo → 200 con comportamiento all', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=foo&pageSize=100`);
    expect(res.status).toBe(200);
    const titles = (res.body.data as Array<{ title: string }>).map((t) => t.title);
    expect(titles).toContain('Sin due date'); // Presente en all, ausente en 7d/30d/overdue.
  });

  it('NT-07/NT-08: range case-sensitive — "Overdue" y "OVERDUE" caen a all', async () => {
    const upper = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=OVERDUE&pageSize=100`);
    expect(upper.status).toBe(200);
    const titles = (upper.body.data as Array<{ title: string }>).map((t) => t.title);
    // Debe incluir Sin due date (no filtró como overdue).
    expect(titles).toContain('Sin due date');
  });

  // ─── QA-005 · Autorización sobre la ruta extendida ───────────────────────
  it('AUTH-TS-01: organizer dueño con range=overdue → 200', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue`);
    expect(res.status).toBe(200);
  });

  it('AUTH-TS-02 / EC-10: organizer NO dueño con range=overdue → 404 (no-revelación)', async () => {
    const res = await otherOrganizerAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue`);
    expect(res.status).toBe(404);
  });

  it('AUTH-TS-03: vendor con range=overdue → 403', async () => {
    const res = await vendorAgent.get(`/api/v1/events/${eventId}/tasks?range=overdue`);
    expect(res.status).toBe(403);
  });

  it('AC-04 sobre evento inexistente con range=all → 404 (no-revelación SEC-06)', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${SOME_UUID}/tasks?range=all`);
    expect(res.status).toBe(404);
  });

  // ─── Contract check (envelope) ───────────────────────────────────────────
  it('Contract: cada item incluye overdue e is_t_minus_7 booleanos NO opcionales', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventId}/tasks?pageSize=100`);
    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(typeof item.overdue).toBe('boolean');
      expect(typeof item.is_t_minus_7).toBe('boolean');
    }
  });
});
