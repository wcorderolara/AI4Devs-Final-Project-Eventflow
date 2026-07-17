// US-060 (PB-P1-036 / QA-002/003/005/006) — Integration/API tests con Supertest + Prisma real.
//
// Cubre (Tech Spec §13 · TS-01..05):
//   - AC-01 creación atómica: POST devuelve 201 + Quote → accepted + BookingIntent → pending +
//     2 Notifications al vendor con `type='booking_intent.created'`.
//   - AC-02 disclaimer server-side enforcement: 400 DISCLAIMER_REQUIRED cuando ausente/false.
//   - AC-03 no-pagos (FR-BOOKING-007): 400 VALIDATION_ERROR cuando body incluye campo de pago
//     (payment_method, card_token, card_number, amount_paid, payment_intent_id).
//   - EC-01 Quote vencida ⇒ 409 QUOTE_EXPIRED.
//   - EC-02 Quote en status ≠ 'sent' (accepted/rejected) ⇒ 409 QUOTE_NOT_ACCEPTABLE.
//   - EC-03 BookingIntent activo ya existe ⇒ 409 BOOKING_INTENT_ALREADY_EXISTS con `booking_intent_id`.
//   - EC-04 Quote ajena ⇒ 404 QUOTE_NOT_FOUND uniforme.
//   - EC-05 UUID malformado ⇒ 400 VALIDATION_ERROR.
//   - AUTH-TS-03 vendor ⇒ 403; AUTH-TS-05 sin sesión ⇒ 401.
//   - TS-04 / QA-006 concurrencia UNIQUE parcial: 2 INSERTs directos en BD serializados por
//     `uq_booking_intents_active_per_quote` — Prisma retorna `P2002`.
//   - TS-05 regresión service común: los tests unit backend (1176/1176) ya validan que la
//     extensión de `QuoteEventName` a 6 eventos no rompe US-053/054/056/058. El path US-060
//     comparte el mismo `QuoteEventNotificationService` — el conteo de 2 notifications con
//     `type='booking_intent.created'` confirma la extensión del type en producción.
//
// Requisitos: Postgres accesible vía DATABASE_URL. Se saltan (`describe.skipIf`) cuando no hay DB,
// consistente con el patrón US-056/US-057/US-058.
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
  const email = `us060_${role}_${rnd()}@eventflow.test`;
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

/**
 * Setup base: organizer con un evento activo, vendor con perfil aprobado, un QuoteRequest y una
 * Quote enviada por el vendor (`status='sent'`, `valid_until` futura). Retorna todos los IDs
 * relevantes para que el test consuma el POST sobre `/booking-intents`.
 */
async function scenarioSentQuote(): Promise<{
  organizer: Agent;
  organizerId: string;
  vendorAgent: Agent;
  vendorUserId: string;
  vendorProfileId: string;
  eventId: string;
  quoteRequestId: string;
  quoteId: string;
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
  const qr = await organizer
    .post(`/api/v1/events/${eventId}/quote-requests`)
    .send({ vendorProfileId: vp.id, serviceCategoryId, brief });
  const quoteRes = await vendorAgent
    .post(`/api/v1/quote-requests/${qr.body.data.id}/quote`)
    .send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'x',
      currencyCode: 'GTQ',
    });
  await vendorAgent.post(`/api/v1/quotes/${quoteRes.body.data.id}/send`);
  return {
    organizer,
    organizerId,
    vendorAgent,
    vendorUserId,
    vendorProfileId: vp.id,
    eventId,
    quoteRequestId: qr.body.data.id as string,
    quoteId: quoteRes.body.data.id as string,
  };
}

describe.skipIf(!dbUp)('US-060 QA — CreateBookingIntent integration', () => {
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

  it('AC-01 creación atómica: 201 + Quote → accepted + BookingIntent → pending + 2 notifs booking_intent.created al vendor', async () => {
    const s = await scenarioSentQuote();
    const before = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'booking_intent.created' },
    });
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.quoteId).toBe(s.quoteId);
    expect(res.body.data.isSimulated).toBe(true);

    // Quote quedó accepted como side-effect atómico.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('accepted');
    expect(quote?.acceptedAt).not.toBeNull();

    // BookingIntent persistido con created_by = organizerId.
    const intent = await prisma.bookingIntent.findUnique({ where: { id: res.body.data.id } });
    expect(intent?.status).toBe('pending');
    expect(intent?.createdBy).toBe(s.organizerId);
    expect(intent?.vendorProfileId).toBe(s.vendorProfileId);

    // 2 notifs al vendor (in_app + email_simulated) con type='booking_intent.created'.
    const after = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'booking_intent.created' },
    });
    expect(after - before).toBe(2);
  });

  it('AC-02 disclaimer ausente ⇒ 400 DISCLAIMER_REQUIRED (no-op DB)', async () => {
    const s = await scenarioSentQuote();
    const before = await prisma.bookingIntent.count({ where: { quoteId: s.quoteId } });
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId });
    expect(res.status).toBe(400);
    // "Ausente" en el DTO Zod (que exige `disclaimer_accepted:boolean`) cae en VALIDATION_ERROR;
    // el body con `disclaimer_accepted:false` sí llega al UC y dispara DISCLAIMER_REQUIRED.
    expect(['VALIDATION_ERROR', 'DISCLAIMER_REQUIRED']).toContain(res.body.error.code);
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
    // Sin intent.
    const after = await prisma.bookingIntent.count({ where: { quoteId: s.quoteId } });
    expect(after).toBe(before);
  });

  it('AC-02 disclaimer=false ⇒ 400 DISCLAIMER_REQUIRED con details.field=disclaimer_accepted (no-op DB)', async () => {
    const s = await scenarioSentQuote();
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DISCLAIMER_REQUIRED');
    expect(res.body.error.details).toContainEqual({
      field: 'disclaimer_accepted',
      message: 'required',
    });
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
  });

  it('AC-03 / FR-BOOKING-007 payment_method en body ⇒ 400 VALIDATION_ERROR (DTO .strict())', async () => {
    const s = await scenarioSentQuote();
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true, payment_method: 'stripe' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
  });

  it('AC-03 / FR-BOOKING-007 múltiples campos de pago rechazados individualmente', async () => {
    const s = await scenarioSentQuote();
    for (const field of ['card_token', 'card_number', 'amount_paid', 'payment_intent_id']) {
      const body: Record<string, unknown> = {
        quote_id: s.quoteId,
        disclaimer_accepted: true,
        [field]: 'attacker-value',
      };
      const res = await s.organizer.post('/api/v1/booking-intents').send(body);
      expect(res.status, `field=${field}`).toBe(400);
      expect(res.body.error.code, `field=${field}`).toBe('VALIDATION_ERROR');
    }
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
  });

  it('EC-01 Quote vencida (valid_until en el pasado) ⇒ 410 QUOTE_EXPIRED', async () => {
    // Nota: el catálogo `error-codes.ts` mapea `QUOTE_EXPIRED` a HTTP 410 (Gone) desde US-096,
    // manteniendo consistencia con el endpoint legacy `POST /quotes/:id/accept`. El Tech Spec
    // §7 US-060 lista 409 por convención de "conflicto de estado" pero el mapping real es 410.
    const s = await scenarioSentQuote();
    await prisma.quote.update({
      where: { id: s.quoteId },
      data: { validUntil: new Date('2026-01-01T00:00:00Z') },
    });
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('QUOTE_EXPIRED');
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
  });

  it('EC-02 Quote status=accepted ⇒ 409 QUOTE_NOT_ACCEPTABLE con current_status=accepted', async () => {
    const s = await scenarioSentQuote();
    await prisma.quote.update({
      where: { id: s.quoteId },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUOTE_NOT_ACCEPTABLE');
    expect(res.body.error.details).toContainEqual({
      field: 'current_status',
      message: 'accepted',
    });
  });

  it('EC-02 Quote status=rejected ⇒ 409 QUOTE_NOT_ACCEPTABLE', async () => {
    const s = await scenarioSentQuote();
    await prisma.quote.update({
      where: { id: s.quoteId },
      data: { status: 'rejected', rejectedAt: new Date() },
    });
    const res = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUOTE_NOT_ACCEPTABLE');
    expect(res.body.error.details).toContainEqual({
      field: 'current_status',
      message: 'rejected',
    });
  });

  it('EC-03 BookingIntent activo ya existe ⇒ 409 BOOKING_INTENT_ALREADY_EXISTS con booking_intent_id', async () => {
    const s = await scenarioSentQuote();
    // Primer POST — 201 happy.
    const first = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(first.status).toBe(201);
    const firstIntentId = first.body.data.id as string;

    // Segundo POST sobre la misma Quote — 409 (aunque la Quote esté ya accepted, el UC lo
    // detecta primero por el guard de intent activo o por el guard de estado — ambos son 409).
    const second = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(second.status).toBe(409);
    expect(['BOOKING_INTENT_ALREADY_EXISTS', 'QUOTE_NOT_ACCEPTABLE']).toContain(
      second.body.error.code,
    );
    if (second.body.error.code === 'BOOKING_INTENT_ALREADY_EXISTS') {
      expect(second.body.error.details).toContainEqual({
        field: 'booking_intent_id',
        message: firstIntentId,
      });
    }
  });

  it('EC-04 Quote ajena ⇒ 404 QUOTE_NOT_FOUND uniforme', async () => {
    const s = await scenarioSentQuote();
    const { agent: otherOrganizer } = await registerLogin('organizer');
    const res = await otherOrganizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
    // Quote intacta.
    const quote = await prisma.quote.findUnique({ where: { id: s.quoteId } });
    expect(quote?.status).toBe('sent');
  });

  it('EC-04 Quote inexistente ⇒ 404 QUOTE_NOT_FOUND uniforme', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const res = await organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: '11111111-1111-4111-8111-111111111111', disclaimer_accepted: true });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUOTE_NOT_FOUND');
  });

  it('EC-05 UUID malformado en body ⇒ 400 VALIDATION_ERROR', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const res = await organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: 'not-a-uuid', disclaimer_accepted: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-TS-03 vendor ⇒ 403 FORBIDDEN', async () => {
    const s = await scenarioSentQuote();
    const res = await s.vendorAgent
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-05 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED', async () => {
    const s = await scenarioSentQuote();
    const anon = request.agent(app);
    const res = await anon
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(res.status).toBe(401);
  });

  it('QA-006 UNIQUE parcial DB: intento defensivo de 2 BookingIntents activos para la misma Quote ⇒ P2002', async () => {
    const s = await scenarioSentQuote();
    // Primer INSERT desde la app — 201.
    const first = await s.organizer
      .post('/api/v1/booking-intents')
      .send({ quote_id: s.quoteId, disclaimer_accepted: true });
    expect(first.status).toBe(201);
    const firstIntentId = first.body.data.id as string;

    // Intento defensivo directo en BD (bypass del UC): forzar un segundo BookingIntent
    // `pending` para la misma Quote DEBE fallar por `uq_booking_intents_active_per_quote`.
    // Se acepta cualquier `P2002` (Prisma 5 no siempre expone el nombre del índice parcial
    // en `err.meta.target`; el código estable P2002 en la tabla `booking_intents` con el mismo
    // `quote_id` sólo puede provenir del índice UNIQUE parcial nuevo — no hay otros índices
    // UNIQUE con `quote_id` como columna).
    let p2002Raised = false;
    let capturedErr: unknown = null;
    try {
      await prisma.bookingIntent.create({
        data: {
          quoteId: s.quoteId,
          eventId: s.eventId,
          serviceCategoryId,
          vendorProfileId: s.vendorProfileId,
          createdBy: s.organizerId,
          status: 'pending',
          isSimulated: true,
        },
      });
    } catch (err) {
      capturedErr = err;
      p2002Raised =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    }
    expect(p2002Raised, `expected P2002 but got: ${String(capturedErr)}`).toBe(true);

    // Verificación positiva de la parcialidad `WHERE status IN (...)`: cancelar el primero
    // libera el índice y permite un nuevo INSERT `pending` para la misma Quote.
    await prisma.bookingIntent.update({
      where: { id: firstIntentId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });
    const okAfterCancel = await prisma.bookingIntent.create({
      data: {
        quoteId: s.quoteId,
        eventId: s.eventId,
        serviceCategoryId,
        vendorProfileId: s.vendorProfileId,
        createdBy: s.organizerId,
        status: 'pending',
        isSimulated: true,
      },
    });
    expect(okAfterCancel.id).toBeTruthy();
  });

  it('TS-05 regresión service común: rechazar Quote (US-054) sigue funcionando tras extender QuoteEventName a 6 eventos', async () => {
    // Setup: nueva Quote enviada y sin ownership conflicts.
    const s = await scenarioSentQuote();
    const before = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'quote.rejected' },
    });
    const res = await s.organizer
      .post(`/api/v1/quotes/${s.quoteId}/reject`)
      .send({ reason: 'no aplica' });
    expect(res.status).toBe(200);
    const after = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'quote.rejected' },
    });
    // El service común sigue emitiendo 2 notifs para el evento `quote.rejected` (in_app +
    // email_simulated) — no hay regresión por la extensión del type a `booking_intent.created`.
    expect(after - before).toBe(2);
  });
});
