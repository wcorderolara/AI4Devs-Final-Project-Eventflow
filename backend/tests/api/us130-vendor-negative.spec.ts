// US-130 / PB-P2-018 — SEC-002. Casos negativos vendor: assignment inválido en QuoteRequest /
// Quote (BR-AUTH-007) + acceso a datos del evento más allá del brief. AC-01/AC-02.
//
// Extiende (no duplica) us096-quote-booking-security. Foco: endpoints assignment del registry
// US-112 NO cubiertos allí (PATCH /quotes/:id, POST /quotes/:id/send, POST /quote-requests/:id/
// quote, PATCH /quote-requests/:id/viewed) + acceso vendor al evento crudo (no debe leer
// `/events/:id` aunque tenga un QR asignado — sólo el brief embebido en el QR).
//
// DB-free: 401 anónimo sobre endpoints assignment (dos casos representativos). DB-gated
// (`skipIf(!dbUp)`): vendor no asignado → PATCH/send/quote/viewed → 404 masked; vendor
// asignado → GET /events/:id crudo → 403/404 (rol no organizer).
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

describe('US-130 SEC-002 (sin BD): anonymous → 401 en endpoints assignment no cubiertos', () => {
  it('PATCH /quotes/:id anónimo → 401', async () => {
    const res = await request(app).patch(`/api/v1/quotes/${UUID}`).send({ totalPrice: '1.00' });
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
  it('POST /quotes/:id/send anónimo → 401', async () => {
    const res = await request(app).post(`/api/v1/quotes/${UUID}/send`).send({});
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
  it('PATCH /quote-requests/:id/viewed anónimo → 401', async () => {
    const res = await request(app).patch(`/api/v1/quote-requests/${UUID}/viewed`).send({});
    expectAuthError(res, 401);
    expectNoLeak(res);
  });
});

describe.skipIf(!dbUp)('US-130 SEC-002 (con BD): vendor no asignado → 404 masked; vendor sin ownership del evento crudo', () => {
  let locationId = '';
  let serviceCategoryId = '';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ai_recommendations, booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    const seeded = await seedCommonCatalog(prisma);
    locationId = seeded.locationId;
    serviceCategoryId = seeded.serviceCategoryId;
  });

  it('NT-03: vendor NO asignado → POST /quote-requests/:id/quote → 404 masked (no crea Quote)', async () => {
    const organizer = await organizerAgent(app);
    const assigned = await vendorAgent(app);
    const other = await vendorAgent(app);
    const vpAssigned = (await vendorProfileFor(prisma, assigned.userId, { businessName: 'A' })).id;
    await vendorProfileFor(prisma, other.userId, { businessName: 'Other' });
    const eventId = await activeEvent(organizer.agent, locationId);
    const qr = await assignedQuoteRequest(organizer.agent, eventId, vpAssigned, serviceCategoryId);
    const res = await other.agent.post(`/api/v1/quote-requests/${qr.id}/quote`).send({
      totalPrice: '100.00', breakdown: [{ label: 's', amount: '100.00' }], conditions: 'std', currencyCode: 'GTQ',
    });
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-03: vendor NO asignado → PATCH /quotes/:id → 404 masked (no muta la Quote ajena)', async () => {
    const organizer = await organizerAgent(app);
    const assigned = await vendorAgent(app);
    const other = await vendorAgent(app);
    const vpAssigned = (await vendorProfileFor(prisma, assigned.userId, { businessName: 'A' })).id;
    await vendorProfileFor(prisma, other.userId, { businessName: 'Other' });
    const eventId = await activeEvent(organizer.agent, locationId);
    const qr = await assignedQuoteRequest(organizer.agent, eventId, vpAssigned, serviceCategoryId);
    const q = await assigned.agent.post(`/api/v1/quote-requests/${qr.id}/quote`).send({
      totalPrice: '100.00', breakdown: [{ label: 's', amount: '100.00' }], conditions: 'std', currencyCode: 'GTQ',
    });
    const res = await other.agent.patch(`/api/v1/quotes/${q.body.data.id}`).send({ totalPrice: '999.00' });
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-03: vendor NO asignado → POST /quotes/:id/send → 404 masked', async () => {
    const organizer = await organizerAgent(app);
    const assigned = await vendorAgent(app);
    const other = await vendorAgent(app);
    const vpAssigned = (await vendorProfileFor(prisma, assigned.userId, { businessName: 'A' })).id;
    await vendorProfileFor(prisma, other.userId, { businessName: 'Other' });
    const eventId = await activeEvent(organizer.agent, locationId);
    const qr = await assignedQuoteRequest(organizer.agent, eventId, vpAssigned, serviceCategoryId);
    const q = await assigned.agent.post(`/api/v1/quote-requests/${qr.id}/quote`).send({
      totalPrice: '100.00', breakdown: [{ label: 's', amount: '100.00' }], conditions: 'std', currencyCode: 'GTQ',
    });
    const res = await other.agent.post(`/api/v1/quotes/${q.body.data.id}/send`).send({});
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-03: vendor NO asignado → PATCH /quote-requests/:id/viewed → 404 masked', async () => {
    const organizer = await organizerAgent(app);
    const assigned = await vendorAgent(app);
    const other = await vendorAgent(app);
    const vpAssigned = (await vendorProfileFor(prisma, assigned.userId, { businessName: 'A' })).id;
    await vendorProfileFor(prisma, other.userId, { businessName: 'Other' });
    const eventId = await activeEvent(organizer.agent, locationId);
    const qr = await assignedQuoteRequest(organizer.agent, eventId, vpAssigned, serviceCategoryId);
    const res = await other.agent.patch(`/api/v1/quote-requests/${qr.id}/viewed`).send({});
    expectAuthError(res, 404);
    expectNoLeak(res);
  });

  it('NT-04: vendor asignado → GET /events/:id (endpoint organizer-only) → 403 (no accede al evento crudo)', async () => {
    // Aunque el vendor tenga un QR asignado del evento, el endpoint `/events/:id` es
    // organizer-only (BR-AUTH-007). El vendor sólo ve el `brief` embebido en el QR, no el evento.
    const organizer = await organizerAgent(app);
    const vendor = await vendorAgent(app);
    const vp = (await vendorProfileFor(prisma, vendor.userId)).id;
    const eventId = await activeEvent(organizer.agent, locationId);
    await assignedQuoteRequest(organizer.agent, eventId, vp, serviceCategoryId);
    const res = await vendor.agent.get(`/api/v1/events/${eventId}`);
    expectAuthError(res, 403);
    expectNoLeak(res);
  });
});
