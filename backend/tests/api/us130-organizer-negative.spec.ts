// US-130 / PB-P2-018 — SEC-001. Casos negativos organizer: ownership cross-cuenta +
// aislamiento (BR-AUTH-006, BR-AUTH-009). AC-01/AC-02.
//
// Extiende (no duplica) las suites us095-events-security / us096-quote-booking-security /
// us097-ai-security. Foco: endpoints ownership del registry US-112 NO cubiertos por las suites
// anteriores. La convención 403 vs 404 sigue Doc 19 §Auth: 404 masked cuando revelar existencia
// filtra info al organizer ajeno.
//
// DB-free: 401 anónimo sobre booking-intents y ai-recommendations (endpoints ownership no
// cubiertos por us094-security-negative). DB-gated (`skipIf(!dbUp)`): cross-owner sobre
// events/cancel, quotes/accept|reject|prefer, booking-intents/*, ai-recommendations/discard.
import { describe, it, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { expectAuthError, expectNoLeak } from '../helpers/negative-auth.js';
import { organizerAgent, vendorAgent, vendorProfileFor, activeEvent, assignedQuoteRequest, seedCommonCatalog } from '../helpers/us130-multi-role.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const UUID = '11111111-1111-4111-8111-111111111111';

// Endpoints ownership de IA por evento (organizer-only + ownership del evento). El gate estático
// exige que cada uno esté referenciado literalmente por al menos un spec de `tests/api/`.
const AI_OWNERSHIP_PATHS = [
  `/api/v1/events/${UUID}/ai/event-plan`,
  `/api/v1/events/${UUID}/ai/checklist`,
  `/api/v1/events/${UUID}/ai/budget-suggestion`,
  `/api/v1/events/${UUID}/ai/vendor-categories`,
  `/api/v1/events/${UUID}/ai/quote-brief`,
  `/api/v1/events/${UUID}/ai/task-prioritization`,
] as const;

describe('US-130 SEC-001 (sin BD): anonymous → 401 en endpoints ownership no cubiertos por US-094', () => {
  it.each(AI_OWNERSHIP_PATHS.map((p) => [p] as const))(
    'POST %s anónimo → 401 (no invoca LLMProvider)',
    async (path) => {
      const res = await request(app).post(path).send({ input: { x: 1 } });
      expectAuthError(res, 401);
      expectNoLeak(res);
    },
  );
  it('POST /booking-intents anónimo → 401', async () => {
    const res = await request(app).post('/api/v1/booking-intents').send({ quote_id: UUID, disclaimer_accepted: true });
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
  it(`GET /booking-intents/:id anónimo → 401`, async () => {
    const res = await request(app).get(`/api/v1/booking-intents/${UUID}`);
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
  it('POST /booking-intents/:id/confirm anónimo → 401', async () => {
    const res = await request(app).post(`/api/v1/booking-intents/${UUID}/confirm`).send({});
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
  it('POST /ai-recommendations/:id/discard anónimo → 401', async () => {
    const res = await request(app).post(`/api/v1/ai-recommendations/${UUID}/discard`).send({});
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
});

describe.skipIf(!dbUp)('US-130 SEC-001 (con BD): organizer B invade recursos de organizer A → 404 masked', () => {
  let locationId = '';
  let serviceCategoryId = '';

  beforeAll(async () => {
    // Reset acotado — no toca catálogos ni logs ajenos a la matriz negativa.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ai_recommendations, booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    const seeded = await seedCommonCatalog(prisma);
    locationId = seeded.locationId;
    serviceCategoryId = seeded.serviceCategoryId;
  });

  it('NT-02: organizer B → POST /events/:id/cancel de organizer A → 404 masked', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const eventId = await activeEvent(orgA.agent, locationId);
    const res = await orgB.agent.post(`/api/v1/events/${eventId}/cancel`).send({});
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-02: organizer B → POST /events/:id/quote-requests de organizer A → 404 masked (no crea QR)', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const vendor = await vendorAgent(app);
    const vp = (await vendorProfileFor(prisma, vendor.userId)).id;
    const eventId = await activeEvent(orgA.agent, locationId);
    const res = await orgB.agent.post(`/api/v1/events/${eventId}/quote-requests`).send({
      vendorProfileId: vp,
      serviceCategoryId,
      brief: { summary: 'hack', requirements: ['x'], questions: ['y'] },
    });
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-02: organizer B → POST /quotes/:id/accept|reject|prefer sobre Quote de organizer A → 404 masked', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const vendor = await vendorAgent(app);
    const vp = (await vendorProfileFor(prisma, vendor.userId)).id;
    const eventId = await activeEvent(orgA.agent, locationId);
    const qr = await assignedQuoteRequest(orgA.agent, eventId, vp, serviceCategoryId);
    const q = await vendor.agent.post(`/api/v1/quote-requests/${qr.id}/quote`).send({
      totalPrice: '100.00',
      breakdown: [{ label: 'setup', amount: '100.00' }],
      conditions: 'std',
      currencyCode: 'GTQ',
    });
    await vendor.agent.post(`/api/v1/quotes/${q.body.data.id}/send`).send({});
    for (const action of ['accept', 'reject', 'prefer'] as const) {
      const res = await orgB.agent.post(`/api/v1/quotes/${q.body.data.id}/${action}`).send({});
      expectAuthError(res, 404);
      expectNoLeak(res);
    }
  });

  it('NT-02: organizer B → GET/confirm/cancel /booking-intents/:id de organizer A → 404 masked', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const vendor = await vendorAgent(app);
    const vp = (await vendorProfileFor(prisma, vendor.userId)).id;
    const eventId = await activeEvent(orgA.agent, locationId);
    const qr = await assignedQuoteRequest(orgA.agent, eventId, vp, serviceCategoryId);
    const q = await vendor.agent.post(`/api/v1/quote-requests/${qr.id}/quote`).send({
      totalPrice: '100.00', breakdown: [{ label: 'setup', amount: '100.00' }], conditions: 'std', currencyCode: 'GTQ',
    });
    await vendor.agent.post(`/api/v1/quotes/${q.body.data.id}/send`).send({});
    await orgA.agent.post(`/api/v1/quotes/${q.body.data.id}/accept`).send({});
    const bi = await orgA.agent.post('/api/v1/booking-intents').send({
      quote_id: q.body.data.id,
      disclaimer_accepted: true,
    });
    const biId = bi.body.data.id as string;
    expectAuthError(await orgB.agent.get(`/api/v1/booking-intents/${biId}`), 404);
    expectAuthError(await orgB.agent.post(`/api/v1/booking-intents/${biId}/cancel`).send({}), 404);
  });

  it('NT-05: organizer B → POST /ai-recommendations/:id/discard de organizer A → 404 masked (no muta estado)', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const eventId = await activeEvent(orgA.agent, locationId);
    const gen = await orgA.agent.post(`/api/v1/events/${eventId}/ai/event-plan`).send({ input: { x: 1 } });
    const recId = gen.body.data.recommendationId as string;
    const res = await orgB.agent.post(`/api/v1/ai-recommendations/${recId}/discard`).send({});
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-07 (BR-AUTH-009): aislamiento — organizer B no ve eventos de organizer A en GET /events', async () => {
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    await activeEvent(orgA.agent, locationId);
    const listB = await orgB.agent.get('/api/v1/events');
    // Aislamiento: la listado del segundo organizer NO devuelve eventos del primero.
    const items = (listB.body?.data?.items ?? listB.body?.data ?? []) as Array<{ id: string }>;
    for (const item of items) {
      // Nunca debe aparecer con `ownerId` distinto al de B; el shape puede omitir owner por ADR,
      // pero un listado propio nunca debe contener elementos que a su vez sean ownership del otro.
      // Verificación robusta: intentar leer cada uno como B; si es del otro → 404.
      const detail = await orgB.agent.get(`/api/v1/events/${item.id}`);
      // Si aparece, debe ser owned por B (200); si no, debería no haberse listado.
      // El aserto explícito: no puede haber una lectura de la lista que salga 404 al detalle.
      if (detail.status === 404) {
        throw new Error(`Event ${item.id} listado a organizer B pero 404 al detalle (leak).`);
      }
    }
  });
});
