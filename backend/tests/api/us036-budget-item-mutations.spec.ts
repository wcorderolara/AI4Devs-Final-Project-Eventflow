// US-036 (PB-P1-020) / QA-002 (R1) — Tests API de las 3 mutaciones sobre BudgetItem.
// - DB-free: anónimo → 401; UUID inválido → 400 VALIDATION_ERROR; body con `paid`/`ai_generated`
//   /`committed`/`service_category_id` → 400 VALIDATION_ERROR.
// - DB-gated (skipIf): IT-01..03 happy path CRUD; IT-04 committed → 409 ITEM_HAS_COMMITMENT;
//   IT-05 pending → 409 ITEM_HAS_PENDING_INTENT; IT-06/07 event cancelled/completed → 409
//   EVENT_NOT_EDITABLE; IT-08 patch category lock → 409; IT-09 hard delete refleja en US-035;
//   IT-10 múltiples items por categoría; IT-11 anti-IDOR cross-event → 404; IT-12 recompute
//   totales Budget.
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
const OTHER_UUID = '22222222-2222-4222-8222-222222222222';
const uniqEmail = (p: string): string =>
  `us036_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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

describe('US-036 QA-002 (sin BD): auth / validación de body', () => {
  it('SEC-T-01: POST anónimo → 401', async () => {
    const res = await request(app)
      .post(`/api/v1/events/${SOME_UUID}/budget/items`)
      .send({ label: 'x', amount_planned: 100 });
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('SEC-T-01: PATCH anónimo → 401', async () => {
    const res = await request(app)
      .patch(`/api/v1/events/${SOME_UUID}/budget/items/${OTHER_UUID}`)
      .send({ label: 'x' });
    expect(res.status).toBe(401);
  });

  it('SEC-T-01: DELETE anónimo → 401', async () => {
    const res = await request(app).delete(`/api/v1/events/${SOME_UUID}/budget/items/${OTHER_UUID}`);
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbUp)('US-036 QA-002 (con BD): CRUD BudgetItem', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let organizerId = '';
  let otherOrganizerAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let eventActiveId = '';
  let eventCancelledId = '';
  let eventCompletedId = '';
  let otherEventId = '';
  let budgetActiveId = '';
  let existingItemId = '';
  let itemWithCommittedId = '';
  let itemWithPendingIntentId = '';
  let itemInOtherEventId = '';
  const CATERING_CODE = 'catering';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE booking_intents, quotes, quote_requests, budget_items, budgets, event_tasks, ai_recommendations, ai_prompt_versions, events, sessions, password_reset_tokens, users, vendor_profiles, vendor_services, event_types, locations, service_categories RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    const catering = await prisma.serviceCategory.create({
      data: { code: CATERING_CODE, label: 'Catering', isActive: true, depthLevel: 1 },
    });
    await prisma.serviceCategory.create({
      data: { code: 'venue', label: 'Venue', isActive: true, depthLevel: 1 },
    });

    organizerAgent = await agentFor('organizer');
    organizerId = (await organizerAgent.get('/api/v1/users/me')).body?.data?.id as string;
    otherOrganizerAgent = await agentFor('organizer');
    const otherId = (await otherOrganizerAgent.get('/api/v1/users/me')).body?.data?.id as string;
    vendorAgent = await agentFor('vendor');

    const eventTypeId = (await prisma.eventType.findFirst())!.id;

    const mkEvent = async (
      userId: string,
      status: 'draft' | 'active' | 'cancelled' | 'completed',
    ): Promise<{ eventId: string; budgetId: string }> => {
      const evt = await prisma.event.create({
        data: {
          userId,
          eventTypeId,
          locationId: loc.id,
          title: `US-036 ${status}`,
          status,
          currency: 'USD',
          eventDate: new Date('2026-12-31T00:00:00Z'),
        },
        select: { id: true },
      });
      const b = await prisma.budget.create({
        data: { eventId: evt.id, totalPlanned: 0, totalCommitted: 0 },
        select: { id: true },
      });
      return { eventId: evt.id, budgetId: b.id };
    };

    ({ eventId: eventActiveId, budgetId: budgetActiveId } = await mkEvent(organizerId, 'active'));
    ({ eventId: eventCancelledId } = await mkEvent(organizerId, 'cancelled'));
    ({ eventId: eventCompletedId } = await mkEvent(organizerId, 'completed'));
    const other = await mkEvent(otherId, 'active');
    otherEventId = other.eventId;

    // Item existente (para PATCH/DELETE happy path). Sin committed.
    const it = await prisma.budgetItem.create({
      data: {
        budgetId: budgetActiveId,
        label: 'Catering existente',
        categoryCode: CATERING_CODE,
        amountPlanned: 500,
        amountCommitted: 0,
      },
      select: { id: true },
    });
    existingItemId = it.id;

    // Item con committed > 0 (bloqueará DELETE + PATCH cambio de categoría).
    const itCommit = await prisma.budgetItem.create({
      data: {
        budgetId: budgetActiveId,
        label: 'Venue con committed',
        categoryCode: 'venue',
        amountPlanned: 1000,
        amountCommitted: 800,
      },
      select: { id: true },
    });
    itemWithCommittedId = itCommit.id;

    // Item con BookingIntent.pending para su categoría (bloqueará DELETE).
    const itPending = await prisma.budgetItem.create({
      data: {
        budgetId: budgetActiveId,
        label: 'Catering pending',
        categoryCode: CATERING_CODE,
        amountPlanned: 200,
        amountCommitted: 0,
      },
      select: { id: true },
    });
    itemWithPendingIntentId = itPending.id;

    // Setup BookingIntent.pending para categoría catering en eventActive: necesita quoteId,
    // que a su vez necesita QuoteRequest + VendorProfile. Creamos la cadena mínima.
    const vendorUser = await prisma.user.findFirst({ where: { role: 'vendor' } });
    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUser!.id,
        businessName: 'Vendor US-036',
        languagesSupported: ['es'],
      },
      select: { id: true },
    });
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        eventId: eventActiveId,
        serviceCategoryId: catering.id,
        status: 'sent',
      },
      select: { id: true },
    });
    const quote = await prisma.quote.create({
      data: {
        quoteRequestId: quoteRequest.id,
        vendorProfileId: vendorProfile.id,
        // US-058 (PB-P1-035 / DB-002): columnas denormalizadas ahora requeridas.
        eventId: eventActiveId,
        serviceCategoryId: catering.id,
        amount: 100,
        currency: 'USD',
        status: 'accepted',
      },
      select: { id: true },
    });
    await prisma.bookingIntent.create({
      data: {
        quoteId: quote.id,
        eventId: eventActiveId,
        serviceCategoryId: catering.id,
        createdBy: organizerId,
        status: 'pending',
        isSimulated: true,
      },
    });

    // Item de OTRO evento (para anti-IDOR IT-11).
    const itOther = await prisma.budgetItem.create({
      data: {
        budgetId: other.budgetId,
        label: 'Ajeno',
        categoryCode: CATERING_CODE,
        amountPlanned: 100,
        amountCommitted: 0,
      },
      select: { id: true },
    });
    itemInOtherEventId = itOther.id;

    // Recompute totales manuales (los seeds no invocan el recompute, pero el sistema en
    // producción los mantiene sincronizados por US-036).
    await prisma.budget.update({
      where: { id: budgetActiveId },
      data: { totalPlanned: 500 + 1000 + 200, totalCommitted: 800 },
    });
  });

  // ────────────────── VALIDACIÓN DE BODY ──────────────────
  it('SEC-T-05: eventId no UUID → 400 VALIDATION_ERROR', async () => {
    const res = await organizerAgent
      .post('/api/v1/events/not-a-uuid/budget/items')
      .send({ label: 'x', amount_planned: 100 });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('IT-04 / VR-04: PATCH con `amount_committed` en body → 400 VALIDATION_ERROR (Zod .strict)', async () => {
    const res = await organizerAgent
      .patch(`/api/v1/events/${eventActiveId}/budget/items/${existingItemId}`)
      .send({ amount_committed: 999 });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('R1: POST con `paid` en body → 400 (campo diferido a P2)', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'x', amount_planned: 10, paid: 5 });
    expect(res.status).toBe(400);
  });

  it('R1: POST con `ai_generated` en body → 400', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'x', amount_planned: 10, ai_generated: true });
    expect(res.status).toBe(400);
  });

  it('R1: POST con `service_category_id` en body → 400', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({
        label: 'x',
        amount_planned: 10,
        service_category_id: '11111111-1111-1111-1111-111111111111',
      });
    expect(res.status).toBe(400);
  });

  it('VR-03: category_code no en whitelist activa → 400 INVALID_CATEGORY_CODE', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'x', amount_planned: 10, category_code: 'not-existing' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CATEGORY_CODE');
  });

  // ────────────────── AUTORIZACIÓN ──────────────────
  it('AUTH-TS-03: vendor → 403', async () => {
    const res = await vendorAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'x', amount_planned: 10 });
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-02: otro organizer sobre evento ajeno → 404 (masked)', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${otherEventId}/budget/items`)
      .send({ label: 'x', amount_planned: 10 });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  // ────────────────── HAPPY PATH CRUD ──────────────────
  it('IT-01: POST happy path → 201 + Location + shape R1', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'Pastelería', category_code: null, amount_planned: 250 });
    expect(res.status).toBe(201);
    expect(res.headers.location).toContain(`/api/v1/events/${eventActiveId}/budget/items/`);
    expect(res.body?.data).toEqual(
      expect.objectContaining({
        label: 'Pastelería',
        category_code: null,
        amount_planned: 250,
        amount_committed: 0,
      }),
    );
    expect(res.body.data).not.toHaveProperty('paid');
    expect(res.body.data).not.toHaveProperty('ai_generated');
  });

  it('IT-02: PATCH happy path → 200 + campos actualizados', async () => {
    const res = await organizerAgent
      .patch(`/api/v1/events/${eventActiveId}/budget/items/${existingItemId}`)
      .send({ label: 'Catering actualizado', amount_planned: 700 });
    expect(res.status).toBe(200);
    expect(res.body?.data?.label).toBe('Catering actualizado');
    expect(res.body.data.amount_planned).toBe(700);
    // Preserva committed system-managed.
    expect(res.body.data.amount_committed).toBe(0);
  });

  it('IT-08 / D5: PATCH cambia category_code con committed > 0 → 409 ITEM_HAS_COMMITMENT_CATEGORY_LOCKED', async () => {
    const res = await organizerAgent
      .patch(`/api/v1/events/${eventActiveId}/budget/items/${itemWithCommittedId}`)
      .send({ category_code: CATERING_CODE });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('ITEM_HAS_COMMITMENT_CATEGORY_LOCKED');
  });

  // ────────────────── BLOQUEOS DELETE ──────────────────
  it('IT-05 / AC-04: DELETE con committed > 0 → 409 ITEM_HAS_COMMITMENT', async () => {
    const res = await organizerAgent.delete(
      `/api/v1/events/${eventActiveId}/budget/items/${itemWithCommittedId}`,
    );
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('ITEM_HAS_COMMITMENT');
  });

  it('IT-06 / AC-05: DELETE con BookingIntent.pending → 409 ITEM_HAS_PENDING_INTENT', async () => {
    const res = await organizerAgent.delete(
      `/api/v1/events/${eventActiveId}/budget/items/${itemWithPendingIntentId}`,
    );
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('ITEM_HAS_PENDING_INTENT');
  });

  it('IT-11 / SEC-T-06: DELETE item de otro evento (anti-IDOR cross-event) → 404 masked', async () => {
    const res = await organizerAgent.delete(
      `/api/v1/events/${eventActiveId}/budget/items/${itemInOtherEventId}`,
    );
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('IT-03 / IT-09: DELETE happy path (item sin bloqueos) → 204 + desaparece de US-035', async () => {
    // Crea un item efímero solo para este test.
    const createRes = await organizerAgent
      .post(`/api/v1/events/${eventActiveId}/budget/items`)
      .send({ label: 'Efímero', amount_planned: 50 });
    const efimeroId = createRes.body?.data?.id as string;

    const delRes = await organizerAgent.delete(
      `/api/v1/events/${eventActiveId}/budget/items/${efimeroId}`,
    );
    expect(delRes.status).toBe(204);

    // Verificar hard delete efectivo — vista US-035 no lo incluye.
    const view = await organizerAgent.get(`/api/v1/events/${eventActiveId}/budget`);
    expect(view.status).toBe(200);
    const ids = (view.body?.data?.items as Array<{ id: string }>).map((i) => i.id);
    expect(ids).not.toContain(efimeroId);
  });

  // ────────────────── BLOQUEO POR ESTADO DEL EVENTO ──────────────────
  it('IT-06b / AC-06: POST en evento cancelled → 409 EVENT_NOT_EDITABLE', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventCancelledId}/budget/items`)
      .send({ label: 'x', amount_planned: 10 });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('IT-07 / AC-06: POST en evento completed → 409 EVENT_NOT_EDITABLE', async () => {
    const res = await organizerAgent
      .post(`/api/v1/events/${eventCompletedId}/budget/items`)
      .send({ label: 'x', amount_planned: 10 });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('EVENT_NOT_EDITABLE');
  });

  // ────────────────── COMPROMISO R1 US-035: TRANSACCIÓN DE TOTALES ──────────────────
  it('IT-12 / BLK-E: mutaciones actualizan Budget.totalPlanned/totalCommitted en la misma transacción', async () => {
    // Estado post-tests anteriores: sumas variables. Comparamos con SUM directo.
    const view = await organizerAgent.get(`/api/v1/events/${eventActiveId}/budget`);
    expect(view.status).toBe(200);
    const items = view.body?.data?.items as Array<{ amount_planned: number; amount_committed: number }>;
    const sumPlanned = items.reduce((a, i) => a + i.amount_planned, 0);
    const sumCommitted = items.reduce((a, i) => a + i.amount_committed, 0);
    expect(view.body.data.summary.total_planned).toBeCloseTo(sumPlanned, 2);
    expect(view.body.data.summary.total_committed).toBeCloseTo(sumCommitted, 2);
  });
});
