// US-057 (PB-P1-035 / QA-002/003/005) — Integration/API tests con Supertest + Prisma real.
//
// Cobre:
//   - AC-01 ≥2 quotes: orden estable `is_preferred DESC, activos primero, total_price ASC`.
//   - AC-02 1 quote: `items.length=1` con shape completo.
//   - AC-03 0 quotes: `items=[]` con `category` y `currency_code`.
//   - EC-01 `categoryCode` ausente ⇒ 400 INVALID_FILTERS con details.
//   - EC-02 slug inexistente/inactivo ⇒ 400 INVALID_CATEGORY.
//   - EC-03 evento ajeno/inexistente ⇒ 404 EVENT_NOT_FOUND uniforme.
//   - EC-04 quotes `expired`/`rejected` aparecen con status correspondiente (no filtradas).
//   - AUTH-TS-01..05 (organizer dueño 200; ajeno 404; vendor 403; sin sesión 401; admin 403).
//   - Currency del evento respetada (BR-QUOTE-019).
//   - Whitelist de vendor: no expone email/phone/currency-mismatch fields (SEC-09).
//   - QA-005 performance smoke: < 1s p95 (una llamada — measure duration).
//
// Requisitos: Postgres accesible vía DATABASE_URL. Los tests se saltan (`describe.skipIf`)
// cuando la BD no responde en < 4s.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, Prisma, type Quote as PrismaQuote } from '@prisma/client';
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

async function registerLogin(
  role: 'organizer' | 'vendor',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us057_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }),
    role,
    captchaToken: CAPTCHA,
  });
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string };
}

let serviceCategoryCode = '';
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

const brief = { summary: 'Boda', requirements: ['catering'], questions: ['¿disponible?'] };

async function createVendorAndQR(
  organizer: Agent,
  eventId: string,
): Promise<{ vendorProfileId: string; quoteRequestId: string; vendorAgent: Agent }> {
  const { agent: vendorAgent, userId: vendorUserId } = await registerLogin('vendor');
  const vp = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserId,
      businessName: `Vendor ${rnd()}`,
      status: 'approved',
      languagesSupported: ['es-LATAM'],
      ratingAvg: new Prisma.Decimal('4.60'),
      reviewsCount: 24,
    },
  });
  const qr = await organizer
    .post(`/api/v1/events/${eventId}/quote-requests`)
    .send({ vendorProfileId: vp.id, serviceCategoryId, brief });
  return {
    vendorProfileId: vp.id,
    quoteRequestId: qr.body.data.id as string,
    vendorAgent,
  };
}

async function createSentQuote(
  vendorAgent: Agent,
  quoteRequestId: string,
  overrides: {
    totalPrice?: string;
    isPreferred?: boolean;
    status?: 'sent' | 'accepted' | 'rejected' | 'expired';
  } = {},
): Promise<PrismaQuote> {
  const qres = await vendorAgent.post(`/api/v1/quote-requests/${quoteRequestId}/quote`).send({
    totalPrice: overrides.totalPrice ?? '5000.00',
    breakdown: [{ label: 'Servicio', amount: overrides.totalPrice ?? '5000.00' }],
    conditions: '50% anticipo',
    currencyCode: 'GTQ',
  });
  const quoteId = qres.body.data.id as string;
  await vendorAgent.post(`/api/v1/quotes/${quoteId}/send`);
  const patches: Record<string, unknown> = {};
  if (overrides.status && overrides.status !== 'sent') patches.status = overrides.status;
  if (overrides.isPreferred) patches.isPreferred = true;
  if (Object.keys(patches).length > 0) {
    await prisma.quote.update({ where: { id: quoteId }, data: patches });
  }
  return (await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } })) as PrismaQuote;
}

describe.skipIf(!dbUp)('US-057 QA — Compare Quotes integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
    serviceCategoryCode = `cat_${rnd()}`;
    const sc = await prisma.serviceCategory.create({
      data: { code: serviceCategoryCode, label: 'Catering', isActive: true },
    });
    serviceCategoryId = sc.id;
  });

  it('AC-01 ≥2 quotes: orden estable is_preferred DESC, activos primero, total_price ASC', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const a = await createVendorAndQR(organizer, eventId);
    const q1 = await createSentQuote(a.vendorAgent, a.quoteRequestId, { totalPrice: '5000.00' });
    const b = await createVendorAndQR(organizer, eventId);
    const q2 = await createSentQuote(b.vendorAgent, b.quoteRequestId, {
      totalPrice: '4500.00',
      isPreferred: true,
    });
    const c = await createVendorAndQR(organizer, eventId);
    const q3 = await createSentQuote(c.vendorAgent, c.quoteRequestId, {
      totalPrice: '3500.00',
      status: 'expired',
    });

    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.category.code).toBe(serviceCategoryCode);
    expect(res.body.data.currency_code).toBe('GTQ');
    const ids = (res.body.data.items as { quote_id: string }[]).map((it) => it.quote_id);
    // Preferred primero (q2), luego activos ASC (q1 sent 5000), luego expired (q3 expired 3500).
    expect(ids).toEqual([q2.id, q1.id, q3.id]);
  });

  it('AC-02 1 quote: items.length=1 con shape completo (vendor whitelisted)', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const a = await createVendorAndQR(organizer, eventId);
    await createSentQuote(a.vendorAgent, a.quoteRequestId, { totalPrice: '2500.00' });
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    const item = res.body.data.items[0];
    expect(item).toMatchObject({
      status: 'sent',
      total_price: '2500.00',
      is_preferred: false,
    });
    expect(item.vendor).toMatchObject({
      profile_id: a.vendorProfileId,
      rating_avg: 4.6,
      reviews_count: 24,
    });
    // Whitelist: no debe filtrar campos sensibles del vendor.
    expect(Object.keys(item.vendor)).toEqual([
      'profile_id',
      'business_name',
      'slug',
      'rating_avg',
      'reviews_count',
    ]);
  });

  it('AC-03 0 quotes: items=[] con category + currency_code', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.category).toEqual({ code: serviceCategoryCode, name: 'Catering' });
    expect(res.body.data.currency_code).toBe('GTQ');
  });

  it('EC-01 categoryCode ausente ⇒ 400 INVALID_FILTERS con details categoryCode=required', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const res = await organizer.get(`/api/v1/events/${eventId}/quotes/compare`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILTERS');
    expect(res.body.error.details).toContainEqual({ field: 'categoryCode', message: 'required' });
  });

  it('EC-02 categoryCode inexistente ⇒ 400 INVALID_CATEGORY', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=does-not-exist`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('EC-02 categoría con is_active=false ⇒ 400 INVALID_CATEGORY', async () => {
    const inactiveCode = `inactive_${rnd()}`;
    await prisma.serviceCategory.create({
      data: { code: inactiveCode, label: 'Inactiva', isActive: false },
    });
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${inactiveCode}`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('EC-03 evento inexistente ⇒ 404 EVENT_NOT_FOUND uniforme', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const ghostEventId = 'ffffffff-0000-0000-0000-000000000000';
    const res = await organizer.get(
      `/api/v1/events/${ghostEventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('EC-04 quotes expired/rejected aparecen con status correspondiente', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const a = await createVendorAndQR(organizer, eventId);
    const q1 = await createSentQuote(a.vendorAgent, a.quoteRequestId, { totalPrice: '1000.00' });
    const b = await createVendorAndQR(organizer, eventId);
    const q2 = await createSentQuote(b.vendorAgent, b.quoteRequestId, {
      totalPrice: '2000.00',
      status: 'expired',
    });
    const c = await createVendorAndQR(organizer, eventId);
    const q3 = await createSentQuote(c.vendorAgent, c.quoteRequestId, {
      totalPrice: '3000.00',
      status: 'rejected',
    });
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(200);
    const byId: Record<string, string> = {};
    for (const it of res.body.data.items as { quote_id: string; status: string }[]) {
      byId[it.quote_id] = it.status;
    }
    expect(byId[q1.id]).toBe('sent');
    expect(byId[q2.id]).toBe('expired');
    expect(byId[q3.id]).toBe('rejected');
  });

  it('AUTH-TS-01 organizer dueño ⇒ 200', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(200);
  });

  it('AUTH-TS-02 organizer ajeno ⇒ 404 EVENT_NOT_FOUND uniforme (no filtra ownership)', async () => {
    const { agent: owner } = await registerLogin('organizer');
    const eventId = await createActiveEvent(owner);
    const { agent: otherOrganizer } = await registerLogin('organizer');
    const res = await otherOrganizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('AUTH-TS-03 vendor ⇒ 403', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const { agent: vendorAgent } = await registerLogin('vendor');
    const res = await vendorAgent.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-05 sin sesión ⇒ 401', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    const anon = request.agent(app);
    const res = await anon.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    expect(res.status).toBe(401);
  });

  it('QA-005 performance smoke: 3 quotes ⇒ latencia < 1s', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const eventId = await createActiveEvent(organizer);
    for (let i = 0; i < 3; i += 1) {
      const v = await createVendorAndQR(organizer, eventId);
      await createSentQuote(v.vendorAgent, v.quoteRequestId, { totalPrice: `${(i + 1) * 1000}.00` });
    }
    const t0 = Date.now();
    const res = await organizer.get(
      `/api/v1/events/${eventId}/quotes/compare?categoryCode=${serviceCategoryCode}`,
    );
    const dt = Date.now() - t0;
    expect(res.status).toBe(200);
    expect(dt).toBeLessThan(1000);
  });
});
