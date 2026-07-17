// US-096 / QA-002 — Integration/API tests Quote/Booking (Supertest + Prisma). AC-01..AC-13.
// Fixtures factory (sin seed): EventType/Location/ServiceCategory, organizer+event activo, vendor
// con VendorProfile. Skip limpio sin BD.
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
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

type Agent = ReturnType<typeof request.agent>;

async function registerLogin(role: 'organizer' | 'vendor'): Promise<{ agent: Agent; userId: string }> {
  const email = `us096_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({ acceptedTerms: true, email, password: 'Secret1234', ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }), role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string };
}

let serviceCategoryId = '';
let locationId = '';

async function createActiveEvent(agent: Agent): Promise<string> {
  const created = await agent.post('/api/v1/events').send({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 100,
    locationId,
    estimatedBudget: '10000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });
  const id = created.body.data.id as string;
  await agent.post(`/api/v1/events/${id}/activate`);
  return id;
}

/** Crea un VendorProfile (con su user vendor) directamente en BD. Devuelve el vendorProfileId. */
async function createVendorProfile(): Promise<string> {
  const user = await prisma.user.create({
    data: { email: `vp_${rnd()}@eventflow.test`, passwordHash: 'x', role: 'vendor' },
  });
  const vp = await prisma.vendorProfile.create({
    data: { userId: user.id, businessName: 'VP', status: 'approved', languagesSupported: ['es-LATAM'] },
  });
  return vp.id;
}

const brief = { summary: 'Boda', requirements: ['catering'], questions: ['¿disponible?'] };

describe.skipIf(!dbUp)('US-096 QA-002 — Quote/Booking integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
    const sc = await prisma.serviceCategory.create({ data: { code: `cat_${rnd()}`, label: 'Catering', isActive: true } });
    serviceCategoryId = sc.id;
  });

  it('flujo bilateral completo: QR → quote → accept → booking → confirm → cancel', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const { agent: vendorAgent, userId: vendorUserId } = await registerLogin('vendor');
    // El vendor necesita un VendorProfile ligado a su user.
    const vendorProfileId = (
      await prisma.vendorProfile.create({
        data: { userId: vendorUserId, businessName: 'Vendor', status: 'approved', languagesSupported: ['es-LATAM'] },
      })
    ).id;
    const eventId = await createActiveEvent(organizer);

    // AC-01: organizer crea QuoteRequest.
    const qrRes = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId, serviceCategoryId, brief });
    expect(qrRes.status).toBe(201);
    expect(qrRes.body.data.status).toBe('sent');
    const quoteRequestId = qrRes.body.data.id as string;

    // AC-02: organizer lista QRs del evento.
    const listOrg = await organizer.get(`/api/v1/events/${eventId}/quote-requests`);
    expect(listOrg.status).toBe(200);
    expect(listOrg.body.pagination.total).toBe(1);

    // AC-03: vendor lista asignados.
    const listVen = await vendorAgent.get('/api/v1/vendors/me/quote-requests');
    expect(listVen.status).toBe(200);
    expect(listVen.body.data.some((q: { id: string }) => q.id === quoteRequestId)).toBe(true);

    // AC-06: vendor marca viewed.
    expect((await vendorAgent.patch(`/api/v1/quote-requests/${quoteRequestId}/viewed`)).status).toBe(204);

    // AC-07: vendor crea quote.
    const quoteRes = await vendorAgent.post(`/api/v1/quote-requests/${quoteRequestId}/quote`).send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'Anticipo 50%',
      currencyCode: 'GTQ',
    });
    expect(quoteRes.status).toBe(201);
    expect(quoteRes.body.data.status).toBe('draft');
    const quoteId = quoteRes.body.data.id as string;

    // AC-08: vendor edita y envía.
    expect((await vendorAgent.patch(`/api/v1/quotes/${quoteId}`).send({ totalPrice: '5500.00' })).status).toBe(200);
    const sent = await vendorAgent.post(`/api/v1/quotes/${quoteId}/send`);
    expect(sent.status).toBe(200);
    expect(sent.body.data.status).toBe('sent');
    expect(sent.body.data.validUntil).not.toBeNull();

    // AC-09: organizer marca preferred.
    expect((await organizer.post(`/api/v1/quotes/${quoteId}/prefer`)).body.data.isPreferred).toBe(true);

    // AC-10: organizer crea BookingIntent — US-060 (PB-P1-036) hace la aceptación atómica de la
    // Quote dentro del mismo endpoint (D1) requiriendo `disclaimer_accepted:true` (D2). La
    // llamada previa a `POST /quotes/:id/accept` (US-096) ya no aplica — DEV-03 del execution
    // record de US-060.
    const biRes = await organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: quoteId, disclaimer_accepted: true });
    expect(biRes.status).toBe(201);
    expect(biRes.body.data).toMatchObject({ status: 'pending', isSimulated: true });
    const bookingIntentId = biRes.body.data.id as string;
    // La Quote quedó `accepted` como side-effect atómico de la creación del intent.
    const q = await prisma.quote.findUnique({ where: { id: quoteId }, select: { status: true, acceptedAt: true } });
    expect(q?.status).toBe('accepted');
    expect(q?.acceptedAt).not.toBeNull();

    // AC-11: vendor confirma.
    const confirmed = await vendorAgent.post(`/api/v1/booking-intents/${bookingIntentId}/confirm`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed_intent');

    // AC-12: retrieve + cancel con reason.
    expect((await organizer.get(`/api/v1/booking-intents/${bookingIntentId}`)).status).toBe(200);
    const cancelled = await organizer.post(`/api/v1/booking-intents/${bookingIntentId}/cancel`).send({ cancellationReason: 'cambio de planes' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({ status: 'cancelled', cancellationReason: 'cambio de planes' });
  });

  it('EC-04/NT-04: 6.ª QuoteRequest activa por event/category → 409 MAX_QUOTE_REQUESTS_EXCEEDED', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    for (let i = 0; i < 5; i++) {
      const vp = await createVendorProfile();
      const r = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief });
      expect(r.status).toBe(201);
    }
    const vp6 = await createVendorProfile();
    const sixth = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp6, serviceCategoryId, brief });
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe('MAX_QUOTE_REQUESTS_EXCEEDED');
  });

  it('EC-05/NT-05: QuoteRequest duplicada activa por event/vendor → 409 DUPLICATE_QUOTE_REQUEST_ACTIVE', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const vp = await createVendorProfile();
    expect((await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief })).status).toBe(201);
    const dup = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_QUOTE_REQUEST_ACTIVE');
  });

  it('EC-07/NT-07: aceptar un quote expirado → 410 QUOTE_EXPIRED', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const { agent: vendorAgent, userId } = await registerLogin('vendor');
    const vp = (await prisma.vendorProfile.create({ data: { userId, businessName: 'V', status: 'approved', languagesSupported: ['es-LATAM'] } })).id;
    const eventId = await createActiveEvent(organizer);
    const qr = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({ vendorProfileId: vp, serviceCategoryId, brief });
    const quoteRes = await vendorAgent.post(`/api/v1/quote-requests/${qr.body.data.id}/quote`).send({
      totalPrice: '100.00', breakdown: [{ label: 'x', amount: '100.00' }], conditions: 'c', currencyCode: 'GTQ',
    });
    const quoteId = quoteRes.body.data.id as string;
    await vendorAgent.post(`/api/v1/quotes/${quoteId}/send`);
    // Fuerza expiración: validUntil en el pasado.
    await prisma.quote.update({ where: { id: quoteId }, data: { validUntil: new Date('2020-01-01T00:00:00Z') } });
    const accept = await organizer.post(`/api/v1/quotes/${quoteId}/accept`);
    expect(accept.status).toBe(410);
    expect(accept.body.error.code).toBe('QUOTE_EXPIRED');
  });
});
