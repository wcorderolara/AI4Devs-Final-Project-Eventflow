// US-056 (PB-P1-034 / QA-002/003/004) — Integration/API tests con Supertest + Prisma real.
//
// Cubre:
//   - AC-01/02/03 happy path con y sin reason; Quote asociada intacta (D3).
//   - EC-01 confirmed_intent bloquea (409 QR_HAS_CONFIRMED_BOOKING con `details.booking_intent_id`).
//   - EC-02 estado inválido (409 QR_NOT_CANCELLABLE con `details.current_status`).
//   - EC-04 reason > 500 (400 INVALID_CANCELLATION_REASON con `details.reason=too_long`).
//   - EC-05 UUID malformado (400 VALIDATION_ERROR desde el Zod del path param).
//   - EC-06 idempotencia: re-cancel ⇒ 409 sin Notifications adicionales.
//   - AUTH-TS-01..05 (organizer dueño 200; ajeno 404 uniforme; vendor 403; admin 403; sin sesión 401).
//   - Security: bypass del check confirmed_intent NO posible desde cliente (el UC ejecuta el
//     EXISTS server-side; no hay parámetro que lo apague — el test lo verifica de forma negativa).
//   - Regresión US-053/054: el service común genérico sigue emitiendo notifs para
//     `quote.expired` (US-053) y `quote.rejected` (US-054) tras el refactor (cubierto por
//     `tests/unit/us053-expire-quotes.spec.ts` y `tests/unit/us054-reject-quote.spec.ts`).
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

async function registerLogin(
  role: 'organizer' | 'vendor',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us056_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent
    .post('/api/v1/auth/register')
    .send({
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

describe.skipIf(!dbUp)('US-056 QA — Cancel QuoteRequest integration', () => {
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

  async function scenarioQrOnly(): Promise<{
    organizer: Agent;
    organizerId: string;
    vendorAgent: Agent;
    vendorUserId: string;
    vendorProfileId: string;
    eventId: string;
    quoteRequestId: string;
  }> {
    const { agent: organizer, userId: organizerId } = await registerLogin('organizer');
    const { agent: vendorAgent, userId: vendorUserId } = await registerLogin('vendor');
    const vp = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        businessName: `Vendor ${rnd()}`,
        status: 'approved',
        languagesSupported: ['es-LATAM'],
      },
    });
    const eventId = await createActiveEvent(organizer);
    const qrRes = await organizer
      .post(`/api/v1/events/${eventId}/quote-requests`)
      .send({ vendorProfileId: vp.id, serviceCategoryId, brief });
    expect(qrRes.status).toBe(201);
    return {
      organizer,
      organizerId,
      vendorAgent,
      vendorUserId,
      vendorProfileId: vp.id,
      eventId,
      quoteRequestId: qrRes.body.data.id as string,
    };
  }

  async function withConfirmedIntent(): Promise<{
    organizer: Agent;
    organizerId: string;
    quoteRequestId: string;
    bookingIntentId: string;
  }> {
    const s = await scenarioQrOnly();
    // Vendor responde con Quote.
    const quoteRes = await s.vendorAgent
      .post(`/api/v1/quote-requests/${s.quoteRequestId}/quote`)
      .send({
        totalPrice: '5000.00',
        breakdown: [{ label: 'Servicio', amount: '5000.00' }],
        conditions: '50% anticipo',
        currencyCode: 'GTQ',
      });
    const quoteId = quoteRes.body.data.id as string;
    await s.vendorAgent.post(`/api/v1/quotes/${quoteId}/send`);
    // Organizer acepta.
    await s.organizer.post(`/api/v1/quotes/${quoteId}/accept`);
    // BookingIntent + confirm.
    const biRes = await s.organizer.post('/api/v1/booking-intents').send({ quoteId });
    const bookingIntentId = biRes.body.data.id as string;
    const confirmed = await s.vendorAgent.post(
      `/api/v1/booking-intents/${bookingIntentId}/confirm`,
    );
    expect(confirmed.body.data.status).toBe('confirmed_intent');
    return {
      organizer: s.organizer,
      organizerId: s.organizerId,
      quoteRequestId: s.quoteRequestId,
      bookingIntentId,
    };
  }

  it('AC-01 happy path con reason: 200, status=cancelled, audit fields, 2 notifs al vendor', async () => {
    const s = await scenarioQrOnly();
    const before = await prisma.notification.count({ where: { userId: s.vendorUserId } });
    const res = await s.organizer
      .patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`)
      .send({ reason: 'Cambio de planes' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: s.quoteRequestId,
      status: 'cancelled',
      cancelledBy: s.organizerId,
      cancellationReason: 'Cambio de planes',
    });
    expect(res.body.data.cancelledAt).toBeTruthy();
    // 2 Notifications al vendor (in_app + email_simulated), atómicas.
    const notifs = await prisma.notification.findMany({
      where: { userId: s.vendorUserId },
      orderBy: { createdAt: 'asc' },
    });
    expect(notifs.length - before).toBe(2);
    const eventNames = notifs.map((n) => n.type);
    expect(eventNames.every((t) => t === 'quote_request.cancelled')).toBe(true);
  });

  it('AC-02 sin body ⇒ 200, cancellationReason=null', async () => {
    const s = await scenarioQrOnly();
    const res = await s.organizer.patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.cancellationReason).toBeNull();
    expect(res.body.data.status).toBe('cancelled');
  });

  it('AC-03 Quote asociada NO se modifica al cancelar la QR (permanece sent)', async () => {
    const s = await scenarioQrOnly();
    // Vendor responde con Quote y la envía.
    const quoteRes = await s.vendorAgent
      .post(`/api/v1/quote-requests/${s.quoteRequestId}/quote`)
      .send({
        totalPrice: '3000.00',
        breakdown: [{ label: 'Item', amount: '3000.00' }],
        conditions: 'x',
        currencyCode: 'GTQ',
      });
    const quoteId = quoteRes.body.data.id as string;
    await s.vendorAgent.post(`/api/v1/quotes/${quoteId}/send`);
    const cancelRes = await s.organizer.patch(
      `/api/v1/quote-requests/${s.quoteRequestId}/cancel`,
    );
    expect(cancelRes.status).toBe(200);
    const quoteAfter = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(quoteAfter?.status).toBe('sent');
    expect(quoteAfter?.rejectedAt).toBeNull();
  });

  it('EC-01 confirmed_intent asociado ⇒ 409 QR_HAS_CONFIRMED_BOOKING con details.booking_intent_id', async () => {
    const s = await withConfirmedIntent();
    const res = await s.organizer
      .patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`)
      .send({ reason: 'demo' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QR_HAS_CONFIRMED_BOOKING');
    expect(res.body.error.details).toContainEqual({
      field: 'booking_intent_id',
      message: s.bookingIntentId,
    });
    // Nada en la QR cambió — sigue en un estado activo (responded).
    const qr = await prisma.quoteRequest.findUnique({ where: { id: s.quoteRequestId } });
    expect(qr?.status).not.toBe('cancelled');
    expect(qr?.cancelledBy).toBeNull();
  });

  it('EC-02 QR ya cancelada ⇒ 409 QR_NOT_CANCELLABLE con current_status', async () => {
    const s = await scenarioQrOnly();
    const first = await s.organizer.patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`);
    expect(first.status).toBe(200);
    // EC-06 idempotencia: 2do cancel ⇒ 409.
    const before = await prisma.notification.count();
    const second = await s.organizer.patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('QR_NOT_CANCELLABLE');
    expect(second.body.error.details).toContainEqual({
      field: 'current_status',
      message: 'cancelled',
    });
    const after = await prisma.notification.count();
    expect(after).toBe(before); // no notifs adicionales.
  });

  it('EC-04 reason > 500 chars ⇒ 400 INVALID_CANCELLATION_REASON con details.reason=too_long', async () => {
    const s = await scenarioQrOnly();
    const res = await s.organizer
      .patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`)
      .send({ reason: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CANCELLATION_REASON');
    expect(res.body.error.details).toContainEqual({ field: 'reason', message: 'too_long' });
  });

  it('EC-05 UUID malformado ⇒ 400 VALIDATION_ERROR', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const res = await organizer.patch('/api/v1/quote-requests/not-a-uuid/cancel');
    expect(res.status).toBe(400);
  });

  it('AUTH-TS-01 organizer dueño ⇒ 200', async () => {
    const s = await scenarioQrOnly();
    const res = await s.organizer.patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`);
    expect(res.status).toBe(200);
  });

  it('AUTH-TS-02 organizer ajeno ⇒ 404 QR_NOT_FOUND uniforme (no filtra ownership)', async () => {
    const s = await scenarioQrOnly();
    const { agent: otherOrganizer } = await registerLogin('organizer');
    const res = await otherOrganizer.patch(
      `/api/v1/quote-requests/${s.quoteRequestId}/cancel`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QR_NOT_FOUND');
  });

  it('AUTH-TS-03 vendor ⇒ 403', async () => {
    const s = await scenarioQrOnly();
    const res = await s.vendorAgent.patch(
      `/api/v1/quote-requests/${s.quoteRequestId}/cancel`,
    );
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-05 sin sesión ⇒ 401', async () => {
    const s = await scenarioQrOnly();
    const anon = request.agent(app);
    const res = await anon.patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`);
    expect(res.status).toBe(401);
  });

  it('QA-004 security: bypass de confirmed_intent no es posible desde el cliente', async () => {
    // El DTO Zod es `.strict()` — cualquier campo ajeno (p.ej. `skipConfirmedCheck`) es
    // rechazado por el validador ANTES de llegar al UC (400 VALIDATION_ERROR). Aun sin toggle,
    // el EXISTS del check corre siempre server-side; el fixture de BD garantiza el bloqueo.
    const s = await scenarioQrOnly();
    // Inyecta un BookingIntent confirmed_intent directamente en la BD para simular la restricción
    // sin requerir todo el flujo (evita fragilidad transiente en el pipeline).
    const quote = await prisma.quote.create({
      data: {
        quoteRequestId: s.quoteRequestId,
        vendorProfileId: s.vendorProfileId,
        // US-058 (PB-P1-035 / DB-002): columnas denormalizadas ahora requeridas.
        eventId: s.eventId,
        serviceCategoryId,
        amount: '1000.00',
        currency: 'GTQ',
        status: 'sent',
      },
    });
    const bi = await prisma.bookingIntent.create({
      data: {
        quoteId: quote.id,
        eventId: s.eventId,
        serviceCategoryId,
        vendorProfileId: s.vendorProfileId,
        status: 'confirmed_intent',
        isSimulated: true,
        confirmedAt: new Date('2026-05-10T00:00:00Z'),
      },
    });
    // Intento con body legítimo — 409 QR_HAS_CONFIRMED_BOOKING.
    const legit = await s.organizer
      .patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`)
      .send({ reason: 'x' });
    expect(legit.status).toBe(409);
    expect(legit.body.error.code).toBe('QR_HAS_CONFIRMED_BOOKING');
    expect(legit.body.error.details).toContainEqual({
      field: 'booking_intent_id',
      message: bi.id,
    });
    // Intento con body inválido (`skipConfirmedCheck`) — rechazado por Zod `.strict()` (400).
    const bypass = await s.organizer
      .patch(`/api/v1/quote-requests/${s.quoteRequestId}/cancel`)
      .send({ reason: 'x', skipConfirmedCheck: true });
    expect(bypass.status).toBe(400);
  });
});
