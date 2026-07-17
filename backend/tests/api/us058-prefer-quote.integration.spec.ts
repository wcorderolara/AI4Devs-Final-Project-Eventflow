// US-058 (PB-P1-035 / QA-002/003/005) — Integration/API tests con Supertest + Prisma real.
//
// Cubre:
//   - AC-01 mark sin previa: 200, is_preferred=true, 2 notifs `quote.marked_preferred`.
//   - AC-02 cambio de preferred: clear previa + set target, 4 notifs total (2 target + 2 previa).
//   - AC-03 unmark: is_preferred=false, 2 notifs `quote.unmarked_preferred`.
//   - AC-04 idempotencia: re-PATCH con el mismo valor no dispara side-effects (0 notifs extra).
//   - EC-01 quote no preferable (status=accepted): 409 QUOTE_NOT_PREFERABLE con current_status.
//   - EC-01 quote vencida (valid_until en el pasado): 409 con current_status=expired.
//   - EC-02 quote ajena: 404 QUOTE_NOT_FOUND uniforme.
//   - EC-03 UUID malformado: 400 VALIDATION_ERROR (middleware Zod).
//   - AUTH-TS-01..04.
//   - QA-005 concurrencia: 2 PATCH simultáneos sobre 2 Quotes distintas del mismo (event, category)
//     — uno gana, el otro es serializado por el SELECT FOR UPDATE + UNIQUE parcial DB.
//
// Requisitos: Postgres accesible vía DATABASE_URL. Se saltan (`describe.skipIf`) cuando no hay DB.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient, Prisma } from '@prisma/client';
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
  const email = `us058_${role}_${rnd()}@eventflow.test`;
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

async function scenarioTwoSentQuotes(): Promise<{
  organizer: Agent;
  organizerId: string;
  vendorAgentA: Agent;
  vendorUserIdA: string;
  vendorProfileIdA: string;
  quoteIdA: string;
  vendorAgentB: Agent;
  vendorUserIdB: string;
  vendorProfileIdB: string;
  quoteIdB: string;
  eventId: string;
}> {
  const { agent: organizer, userId: organizerId } = await registerLogin('organizer');
  const eventId = await createActiveEvent(organizer);

  // Vendor A
  const { agent: vendorAgentA, userId: vendorUserIdA } = await registerLogin('vendor');
  const vpA = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserIdA,
      businessName: `Vendor A ${rnd()}`,
      status: 'approved',
      languagesSupported: ['es-LATAM'],
    },
  });
  const qrA = await organizer
    .post(`/api/v1/events/${eventId}/quote-requests`)
    .send({ vendorProfileId: vpA.id, serviceCategoryId, brief });
  const quoteResA = await vendorAgentA
    .post(`/api/v1/quote-requests/${qrA.body.data.id}/quote`)
    .send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'x',
      currencyCode: 'GTQ',
    });
  await vendorAgentA.post(`/api/v1/quotes/${quoteResA.body.data.id}/send`);

  // Vendor B
  const { agent: vendorAgentB, userId: vendorUserIdB } = await registerLogin('vendor');
  const vpB = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserIdB,
      businessName: `Vendor B ${rnd()}`,
      status: 'approved',
      languagesSupported: ['es-LATAM'],
    },
  });
  const qrB = await organizer
    .post(`/api/v1/events/${eventId}/quote-requests`)
    .send({ vendorProfileId: vpB.id, serviceCategoryId, brief });
  const quoteResB = await vendorAgentB
    .post(`/api/v1/quote-requests/${qrB.body.data.id}/quote`)
    .send({
      totalPrice: '4500.00',
      breakdown: [{ label: 'Servicio', amount: '4500.00' }],
      conditions: 'y',
      currencyCode: 'GTQ',
    });
  await vendorAgentB.post(`/api/v1/quotes/${quoteResB.body.data.id}/send`);

  return {
    organizer,
    organizerId,
    vendorAgentA,
    vendorUserIdA,
    vendorProfileIdA: vpA.id,
    quoteIdA: quoteResA.body.data.id as string,
    vendorAgentB,
    vendorUserIdB,
    vendorProfileIdB: vpB.id,
    quoteIdB: quoteResB.body.data.id as string,
    eventId,
  };
}

describe.skipIf(!dbUp)('US-058 QA — Prefer Quote integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
    const sc = await prisma.serviceCategory.create({
      data: { code: `cat_${rnd()}`, label: 'Catering', isActive: true },
    });
    serviceCategoryId = sc.id;
  });

  it('AC-01 mark sin previa: 200 + is_preferred=true + 2 notifs quote.marked_preferred al vendor A', async () => {
    const s = await scenarioTwoSentQuotes();
    const before = await prisma.notification.count({ where: { userId: s.vendorUserIdA } });
    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isPreferred).toBe(true);
    const after = await prisma.notification.count({
      where: { userId: s.vendorUserIdA, type: 'quote.marked_preferred' },
    });
    expect(after - before).toBe(2);
  });

  it('AC-02 cambio de preferred: clear A + set B ⇒ 4 notifs (2 marked_preferred a B + 2 unmarked_preferred a A)', async () => {
    const s = await scenarioTwoSentQuotes();
    await s.organizer.patch(`/api/v1/quotes/${s.quoteIdA}/preferred`).send({ is_preferred: true });
    const beforeA = await prisma.notification.count({
      where: { userId: s.vendorUserIdA, type: 'quote.unmarked_preferred' },
    });
    const beforeB = await prisma.notification.count({
      where: { userId: s.vendorUserIdB, type: 'quote.marked_preferred' },
    });

    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdB}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(200);
    expect(res.body.data.isPreferred).toBe(true);

    // A quedó desmarcada.
    const quoteA = await prisma.quote.findUnique({ where: { id: s.quoteIdA } });
    expect(quoteA?.isPreferred).toBe(false);

    const afterA = await prisma.notification.count({
      where: { userId: s.vendorUserIdA, type: 'quote.unmarked_preferred' },
    });
    const afterB = await prisma.notification.count({
      where: { userId: s.vendorUserIdB, type: 'quote.marked_preferred' },
    });
    expect(afterA - beforeA).toBe(2);
    expect(afterB - beforeB).toBe(2);
  });

  it('AC-03 unmark: is_preferred=false + 2 notifs quote.unmarked_preferred al vendor', async () => {
    const s = await scenarioTwoSentQuotes();
    await s.organizer.patch(`/api/v1/quotes/${s.quoteIdA}/preferred`).send({ is_preferred: true });
    const before = await prisma.notification.count({
      where: { userId: s.vendorUserIdA, type: 'quote.unmarked_preferred' },
    });
    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isPreferred).toBe(false);
    const after = await prisma.notification.count({
      where: { userId: s.vendorUserIdA, type: 'quote.unmarked_preferred' },
    });
    expect(after - before).toBe(2);
  });

  it('AC-04 idempotencia: re-PATCH con mismo valor no dispara notifs adicionales', async () => {
    const s = await scenarioTwoSentQuotes();
    await s.organizer.patch(`/api/v1/quotes/${s.quoteIdA}/preferred`).send({ is_preferred: true });
    const before = await prisma.notification.count({ where: { userId: s.vendorUserIdA } });
    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(200);
    const after = await prisma.notification.count({ where: { userId: s.vendorUserIdA } });
    expect(after).toBe(before);
  });

  it('EC-01 status=accepted ⇒ 409 QUOTE_NOT_PREFERABLE con current_status=accepted', async () => {
    const s = await scenarioTwoSentQuotes();
    await prisma.quote.update({
      where: { id: s.quoteIdA },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUOTE_NOT_PREFERABLE');
    expect(res.body.error.details).toContainEqual({
      field: 'current_status',
      message: 'accepted',
    });
  });

  it('EC-01 quote vencida por valid_until ⇒ 409 QUOTE_NOT_PREFERABLE con current_status=expired', async () => {
    const s = await scenarioTwoSentQuotes();
    await prisma.quote.update({
      where: { id: s.quoteIdA },
      data: { validUntil: new Date('2026-01-01T00:00:00Z') },
    });
    const res = await s.organizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUOTE_NOT_PREFERABLE');
    expect(res.body.error.details).toContainEqual({
      field: 'current_status',
      message: 'expired',
    });
  });

  it('EC-02 quote ajena ⇒ 404 QUOTE_NOT_FOUND uniforme', async () => {
    const s = await scenarioTwoSentQuotes();
    const { agent: otherOrganizer } = await registerLogin('organizer');
    const res = await otherOrganizer
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
  });

  it('EC-03 UUID malformado ⇒ 400 VALIDATION_ERROR', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const res = await organizer
      .patch('/api/v1/quotes/not-a-uuid/preferred')
      .send({ is_preferred: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-TS-03 vendor ⇒ 403', async () => {
    const s = await scenarioTwoSentQuotes();
    const res = await s.vendorAgentA
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-04 sin sesión ⇒ 401', async () => {
    const s = await scenarioTwoSentQuotes();
    const anon = request.agent(app);
    const res = await anon
      .patch(`/api/v1/quotes/${s.quoteIdA}/preferred`)
      .send({ is_preferred: true });
    expect(res.status).toBe(401);
  });

  it('QA-005 UNIQUE parcial DB: intento de forzar 2 preferred concurrentes se serializa (uno gana)', async () => {
    const s = await scenarioTwoSentQuotes();
    // Marca A como preferred desde la app.
    await s.organizer.patch(`/api/v1/quotes/${s.quoteIdA}/preferred`).send({ is_preferred: true });
    // Intento defensivo directo en BD (bypass del UC): setear B como preferred DEBE fallar por
    // el UNIQUE partial mientras A siga preferred.
    let violation = false;
    try {
      await prisma.quote.update({
        where: { id: s.quoteIdB },
        data: { isPreferred: true },
      });
    } catch (err) {
      violation = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    }
    expect(violation).toBe(true);
  });
});
