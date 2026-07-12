// US-096 / QA-003 — Security/domain negative tests Quote/Booking. §12; NT-01/02/03.
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
const UUID = '11111111-1111-4111-8111-111111111111';
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
type Agent = ReturnType<typeof request.agent>;

async function registerLogin(role: 'organizer' | 'vendor'): Promise<{ agent: Agent; userId: string }> {
  const email = `us096sec_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({ acceptedTerms: true, email, password: 'Secret1234', ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }), role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string };
}

describe('QA-003 (sin BD): anonymous y rutas fuera de scope', () => {
  it('NT-01: anonymous → 401', async () => {
    expect((await request(app).get('/api/v1/vendors/me/quote-requests')).status).toBe(401);
    expect((await request(app).post('/api/v1/booking-intents').send({ quoteId: UUID })).status).toBe(401);
    expect((await request(app).get(`/api/v1/quote-requests/${UUID}`)).status).toBe(401);
  });

  it('scope: ruta plural `/quote-requests/:id/quotes` no existe → 404', async () => {
    expect((await request(app).get(`/api/v1/quote-requests/${UUID}/quotes`)).status).toBe(404);
  });
});

describe.skipIf(!dbUp)('QA-003 (con BD): role, ownership y assignment', () => {
  let serviceCategoryId = '';
  let locationId = '';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    locationId = (await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })).id;
    serviceCategoryId = (await prisma.serviceCategory.create({ data: { code: `cat_${rnd()}`, label: 'C', isActive: true } })).id;
  });

  async function activeEvent(agent: Agent): Promise<string> {
    const c = await agent.post('/api/v1/events').send({
      eventTypeCode: 'wedding', eventDate: '2026-12-31', guestsCount: 50, locationId,
      estimatedBudget: '1000.00', currencyCode: 'GTQ', languageCode: 'es-LATAM',
    });
    const id = c.body.data.id as string;
    await agent.post(`/api/v1/events/${id}/activate`);
    return id;
  }

  it('AUTH-TS-06: vendor intenta accept quote (acción de organizer) → 403', async () => {
    const { agent: vendor } = await registerLogin('vendor');
    expect((await vendor.post(`/api/v1/quotes/${UUID}/accept`)).status).toBe(403);
  });

  it('organizer intenta crear quote (acción de vendor) → 403', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    expect(
      (await organizer.post(`/api/v1/quote-requests/${UUID}/quote`).send({
        totalPrice: '1.00', breakdown: [{ label: 'x', amount: '1.00' }], conditions: 'c', currencyCode: 'GTQ',
      })).status,
    ).toBe(403);
  });

  it('NT-02: organizer B accede a QuoteRequest de organizer A → 404 masked', async () => {
    const { agent: orgA } = await registerLogin('organizer');
    const { agent: orgB } = await registerLogin('organizer');
    const { userId: vUserId } = await registerLogin('vendor');
    const vp = (await prisma.vendorProfile.create({ data: { userId: vUserId, businessName: 'V', status: 'approved', languagesSupported: ['es-LATAM'] } })).id;
    const eventId = await activeEvent(orgA);
    const qr = await orgA.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief: { summary: 's', requirements: ['r'], questions: ['q'] } });
    const qrId = qr.body.data.id as string;
    expect((await orgB.get(`/api/v1/quote-requests/${qrId}`)).status).toBe(404);
    expect((await orgB.patch(`/api/v1/quote-requests/${qrId}/cancel`)).status).toBe(404);
  });

  it('NT-03: vendor no asignado accede a QuoteRequest → 404 masked', async () => {
    const { agent: orgA } = await registerLogin('organizer');
    const { userId: assignedUserId } = await registerLogin('vendor');
    const { agent: otherVendor, userId: otherUserId } = await registerLogin('vendor');
    const assignedVp = (await prisma.vendorProfile.create({ data: { userId: assignedUserId, businessName: 'A', status: 'approved', languagesSupported: ['es-LATAM'] } })).id;
    await prisma.vendorProfile.create({ data: { userId: otherUserId, businessName: 'B', status: 'approved', languagesSupported: ['es-LATAM'] } });
    const eventId = await activeEvent(orgA);
    const qr = await orgA.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: assignedVp, serviceCategoryId, brief: { summary: 's', requirements: ['r'], questions: ['q'] } });
    const qrId = qr.body.data.id as string;
    // El otro vendor no está asignado → 404 al ver detalle y al marcar viewed.
    expect((await otherVendor.get(`/api/v1/quote-requests/${qrId}`)).status).toBe(404);
    expect((await otherVendor.patch(`/api/v1/quote-requests/${qrId}/viewed`)).status).toBe(404);
  });
});
