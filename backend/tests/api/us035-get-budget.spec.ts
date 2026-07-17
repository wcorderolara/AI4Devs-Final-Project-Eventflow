// US-035 (PB-P1-020) / QA-002 (R1) — Tests API de `GET /api/v1/events/:eventId/budget`.
// - DB-free: anónimo → 401; UUID inválido → 400 VALIDATION.
// - DB-gated (skipIf): happy path (IT-01), empty state (IT-02), warning (IT-03),
//   estados evento cancelled/completed (IT-05/06), independencia autorización (IT-07),
//   negativas AUTH-TS-02..04 y SEC-06 masked 404.
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
  `us035_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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

describe('US-035 QA-002 (sin BD): auth y forma del payload', () => {
  it('SEC-T-01 / NT-03: anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).get(`/api/v1/events/${SOME_UUID}/budget`);
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-035 QA-002 (con BD): vista del presupuesto', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let organizerId = '';
  let otherOrganizerAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let eventActiveId = '';
  let eventEmptyBudgetId = '';
  let eventOvercommitId = '';
  let eventCancelledId = '';
  let eventCompletedId = '';
  let otherEventId = '';

  beforeAll(async () => {
    // TRUNCATE cadena mínima para aislar el test (patrón US-027).
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE budget_items, budgets, event_tasks, ai_recommendations, ai_prompt_versions, events, sessions, password_reset_tokens, users, event_types, locations, service_categories RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({
      data: { code: 'wedding', label: 'Wedding', isActive: true },
    });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });

    organizerAgent = await agentFor('organizer');
    organizerId = (await organizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    otherOrganizerAgent = await agentFor('organizer');
    const otherId = (await otherOrganizerAgent.get('/api/v1/users/me')).body?.data?.id as string;

    vendorAgent = await agentFor('vendor');

    const eventTypeId = (await prisma.eventType.findFirst())!.id;

    const mkEvent = async (
      userId: string,
      title: string,
      status: 'draft' | 'active' | 'cancelled' | 'completed',
      currency: 'USD' | 'EUR' | 'MXN' | 'GTQ' | 'COP' = 'USD',
    ): Promise<string> => {
      const evt = await prisma.event.create({
        data: {
          userId,
          eventTypeId,
          locationId: loc.id,
          title,
          status,
          currency,
          eventDate: new Date('2026-12-31T00:00:00Z'),
        },
        select: { id: true },
      });
      return evt.id;
    };

    eventActiveId = await mkEvent(organizerId, 'US-035 dentro', 'active', 'USD');
    eventEmptyBudgetId = await mkEvent(organizerId, 'US-035 empty', 'active', 'GTQ');
    eventOvercommitId = await mkEvent(organizerId, 'US-035 exceso', 'active', 'MXN');
    eventCancelledId = await mkEvent(organizerId, 'US-035 cancelled', 'cancelled', 'EUR');
    eventCompletedId = await mkEvent(organizerId, 'US-035 completed', 'completed', 'COP');
    otherEventId = await mkEvent(otherId, 'ajeno', 'active', 'USD');

    // Budget dentro: totalCommitted < totalPlanned (over_committed=false), 2 items.
    const bActive = await prisma.budget.create({
      data: { eventId: eventActiveId, totalPlanned: 10000, totalCommitted: 6000 },
    });
    await prisma.budgetItem.createMany({
      data: [
        {
          budgetId: bActive.id,
          label: 'Catering',
          categoryCode: 'catering',
          amountPlanned: 6000,
          amountCommitted: 4000,
        },
        {
          budgetId: bActive.id,
          label: 'Otros',
          categoryCode: null,
          amountPlanned: 4000,
          amountCommitted: 2000,
        },
      ],
    });

    // Budget vacío: sin items.
    await prisma.budget.create({
      data: { eventId: eventEmptyBudgetId, totalPlanned: 0, totalCommitted: 0 },
    });

    // Budget con exceso: totalCommitted > totalPlanned.
    const bOver = await prisma.budget.create({
      data: { eventId: eventOvercommitId, totalPlanned: 500, totalCommitted: 800 },
    });
    await prisma.budgetItem.create({
      data: {
        budgetId: bOver.id,
        label: 'Salón',
        categoryCode: 'venue',
        amountPlanned: 500,
        amountCommitted: 800,
      },
    });

    // Budget en evento cancelled/completed (autorización 200 igual, AC-06 / D3).
    await prisma.budget.create({
      data: { eventId: eventCancelledId, totalPlanned: 100, totalCommitted: 50 },
    });
    await prisma.budget.create({
      data: { eventId: eventCompletedId, totalPlanned: 100, totalCommitted: 100 },
    });

    // Budget del evento ajeno.
    await prisma.budget.create({
      data: { eventId: otherEventId, totalPlanned: 200, totalCommitted: 100 },
    });
  });

  it('IT-01 / AC-01+04: 200 con { summary, items[] } shape canónico R1', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventActiveId}/budget`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.summary).toEqual({
      total_planned: 10000,
      total_committed: 6000,
      over_committed: false,
      currency_code: 'USD',
      // US-038 (BE-003) AC-01: campo siempre presente en el shape extendido.
      overcommitted_amount: 0,
      // US-064 (BE-001) AC-02: `available = planned - committed`.
      available: 4000,
    });
    expect(res.body.data.items).toHaveLength(2);
    for (const item of res.body.data.items) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('category_code');
      expect(item).toHaveProperty('amount_planned');
      expect(item).toHaveProperty('amount_committed');
      // R1: sin `paid`, `paid_total`, `ai_generated`, `service_category_id`, `category_name`.
      expect(item).not.toHaveProperty('paid');
      expect(item).not.toHaveProperty('ai_generated');
      expect(item).not.toHaveProperty('service_category_id');
      expect(item).not.toHaveProperty('category_name');
    }
    expect(res.body.data.summary).not.toHaveProperty('paid_total');
  });

  it('IT-02 / EC-01: empty state (items: []) con summary en ceros', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventEmptyBudgetId}/budget`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.summary).toEqual({
      total_planned: 0,
      total_committed: 0,
      over_committed: false,
      currency_code: 'GTQ',
      overcommitted_amount: 0,
      available: 0,
    });
  });

  it('IT-03 / AC-03: over_committed=true cuando totalCommitted > totalPlanned', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventOvercommitId}/budget`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.over_committed).toBe(true);
    expect(res.body.data.summary.currency_code).toBe('MXN');
  });

  it('IT-05 / EC-04: evento cancelled → 200 con cálculo real', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventCancelledId}/budget`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.currency_code).toBe('EUR');
    expect(res.body.data.summary.total_planned).toBe(100);
  });

  it('IT-06 / EC-05: evento completed → 200 con cálculo real', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventCompletedId}/budget`);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.currency_code).toBe('COP');
    // Boundary: totalCommitted == totalPlanned NO es exceso.
    expect(res.body.data.summary.over_committed).toBe(false);
  });

  it('AUTH-TS-02 / SEC-06: otro organizer sobre evento ajeno → 404 masked', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${otherEventId}/budget`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('AUTH-TS-03 / SEC-T-03: vendor → 403 FORBIDDEN', async () => {
    const res = await vendorAgent.get(`/api/v1/events/${eventActiveId}/budget`);
    expect(res.status).toBe(403);
  });

  it('SEC-T-05 / VR-02 / NT-05: eventId no UUID → 400 VALIDATION', async () => {
    const res = await organizerAgent.get('/api/v1/events/not-a-uuid/budget');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION');
  });

  it('IT-07 / AC-06: estado del evento NO altera autorización (cancelled sigue accesible al owner)', async () => {
    const res = await organizerAgent.get(`/api/v1/events/${eventCancelledId}/budget`);
    expect(res.status).toBe(200);
  });
});
