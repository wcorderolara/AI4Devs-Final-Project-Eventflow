// US-065 (PB-P1-038 / QA-002/003/005/006) — Integration/API tests con Supertest + Prisma real.
//
// Cubre (Tech Spec §13 · TS-01..TS-04 + Concurrencia + Security):
//   TS-01 creación válida + denormalize atómico (rating_avg + reviews_count).
//   TS-02 comment ausente/vacío persiste null (AC-02).
//   TS-03 2 Notifications atómicas al vendor con `type='review.published'`.
//   AC-03 duplicado ⇒ 403 REVIEW_NOT_ELIGIBLE reason='already_reviewed'.
//   EC-01 sin BookingIntent confirmed_intent ⇒ 403 REVIEW_NOT_ELIGIBLE reason='no_booking'.
//   EC-02 event no completado ⇒ 403 REVIEW_NOT_ELIGIBLE reason='event_not_completed'.
//   EC-03 ventana > 30 días ⇒ 403 REVIEW_NOT_ELIGIBLE reason='window_expired'.
//   EC-04 rating fuera de 1..5 ⇒ 400 VALIDATION_ERROR.
//   EC-05 comment > 2000 ⇒ 400 VALIDATION_ERROR.
//   EC-06 event/vendor inexistente ⇒ 404 RESOURCE_NOT_FOUND uniforme.
//   EC-07 organizer ajeno ⇒ 404 RESOURCE_NOT_FOUND uniforme (masking).
//   AUTH-TS-04/05 vendor/admin ⇒ 403 FORBIDDEN.
//   AUTH-TS-06 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED.
//   QA-005 concurrencia: 2 POST simultáneos — uno gana (201), el otro cae en `already_reviewed`.
//   QA-006 FR-REVIEW-007: PATCH/DELETE de `/organizer/reviews/:id` no existen ⇒ 404 natural.
//
// Regresión service común (US-053..US-064): la extensión de `QuoteEventName` a 9 eventos NO
// puede romper los tests unit backend previos — el conteo de 2 notifs con
// `type='review.published'` valida que el fan-out compartido sigue operando bilateralmente.
import { beforeAll, describe, expect, it } from 'vitest';
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

let serviceCategoryId = '';
let locationId = '';

async function registerLogin(
  role: 'organizer' | 'vendor',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us065_${role}_${rnd()}@eventflow.test`;
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

interface Scenario {
  organizer: Agent;
  organizerId: string;
  vendorAgent: Agent;
  vendorUserId: string;
  vendorProfileId: string;
  eventId: string;
  quoteRequestId: string;
  quoteId: string;
  bookingIntentId: string;
}

/**
 * Escenario completo listo para publicar reseña:
 *   organizer con evento `completed` (5 días atrás) + vendor aprobado + Quote enviada +
 *   BookingIntent `confirmed_intent`.
 */
async function scenarioCompletedEventWithConfirmedBooking(opts: {
  daysAgo?: number;
  eventCompletedAt?: Date | null;
} = {}): Promise<Scenario> {
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
    .send({
      vendorProfileId: vp.id,
      serviceCategoryId,
      brief: { summary: 'Boda', requirements: ['catering'], questions: ['?'] },
    });
  const quoteRes = await vendorAgent
    .post(`/api/v1/quote-requests/${qr.body.data.id}/quote`)
    .send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'x',
      currencyCode: 'GTQ',
    });
  await vendorAgent.post(`/api/v1/quotes/${quoteRes.body.data.id}/send`);
  const bookingRes = await organizer
    .post('/api/v1/booking-intents')
    .send({ quote_id: quoteRes.body.data.id, disclaimer_accepted: true });
  const bookingIntentId = bookingRes.body.data.id as string;

  // Confirm por el vendor (transición pending → confirmed_intent).
  await vendorAgent
    .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
    .send({ disclaimer_accepted: true });

  // Marcar evento como completado (bypass del job US-015 para test controlado).
  const completedAt =
    opts.eventCompletedAt === null
      ? null
      : opts.eventCompletedAt ??
        new Date(Date.now() - (opts.daysAgo ?? 5) * 24 * 60 * 60 * 1000);
  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: completedAt ? 'completed' : 'active',
      completedAt,
      autoCompleted: completedAt !== null,
    },
  });

  return {
    organizer,
    organizerId,
    vendorAgent,
    vendorUserId,
    vendorProfileId: vp.id,
    eventId,
    quoteRequestId: qr.body.data.id as string,
    quoteId: quoteRes.body.data.id as string,
    bookingIntentId,
  };
}

const UUID = '11111111-1111-4111-8111-111111111111';

describe.skipIf(!dbUp)('US-065 QA — CreateReview integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, notifications, booking_intents, quotes, quote_requests, budget_items, budgets, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
    const sc = await prisma.serviceCategory.create({
      data: { code: `cat_${rnd()}`, label: 'Catering', isActive: true },
    });
    serviceCategoryId = sc.id;
  }, 60_000);

  it('TS-01 AC-01 happy path: 201 + INSERT review + denormalize + 2 notifs review.published al vendor', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const notifBefore = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'review.published' },
    });
    const res = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({
        event_id: s.eventId,
        vendor_profile_id: s.vendorProfileId,
        rating: 4,
        comment: 'Excelente servicio.',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.eventId).toBe(s.eventId);
    expect(res.body.data.vendorProfileId).toBe(s.vendorProfileId);
    expect(res.body.data.bookingIntentId).toBe(s.bookingIntentId);
    expect(res.body.data.authorUserId).toBe(s.organizerId);

    // Denormalize atómico en VendorProfile.
    const vp = await prisma.vendorProfile.findUnique({ where: { id: s.vendorProfileId } });
    expect(vp?.reviewsCount).toBe(1);
    expect(vp?.ratingAvg?.toString()).toBe('4');

    // 2 notifs al vendor con type='review.published'.
    const notifAfter = await prisma.notification.count({
      where: { userId: s.vendorUserId, type: 'review.published' },
    });
    expect(notifAfter - notifBefore).toBe(2);
  });

  it('TS-02 AC-02 comment ausente ⇒ persiste null; string vacío/whitespace ⇒ null', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const r1 = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 5 });
    expect(r1.status).toBe(201);
    expect(r1.body.data.comment).toBeNull();

    // Nuevo escenario (otro evento/vendor) para probar whitespace-only.
    const s2 = await scenarioCompletedEventWithConfirmedBooking();
    const r2 = await s2.organizer.post('/api/v1/organizer/reviews').send({
      event_id: s2.eventId,
      vendor_profile_id: s2.vendorProfileId,
      rating: 3,
      comment: '   ',
    });
    expect(r2.status).toBe(201);
    expect(r2.body.data.comment).toBeNull();
  });

  it('AC-03 duplicado ⇒ 403 REVIEW_NOT_ELIGIBLE reason=already_reviewed', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const ok = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 5 });
    expect(ok.status).toBe(201);
    const dup = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 4 });
    expect(dup.status).toBe(403);
    expect(dup.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
    expect(dup.body.error.details).toContainEqual({ field: 'reason', message: 'already_reviewed' });
  });

  it('EC-01 sin BookingIntent confirmed_intent ⇒ 403 no_booking', async () => {
    // Escenario minimalista: evento completed pero SIN booking confirmed.
    const { agent: organizer } = await registerLogin('organizer');
    const { userId: vendorUserId } = await registerLogin('vendor');
    const vp = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        businessName: `Vendor ${rnd()}`,
        status: 'approved',
        languagesSupported: ['es-LATAM'],
      },
    });
    const eventId = await createActiveEvent(organizer);
    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        autoCompleted: true,
      },
    });
    const res = await organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: eventId, vendor_profile_id: vp.id, rating: 4 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
    expect(res.body.error.details).toContainEqual({ field: 'reason', message: 'no_booking' });
  });

  it('EC-02 event no completado ⇒ 403 event_not_completed', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking({ eventCompletedAt: null });
    const res = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 4 });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toContainEqual({ field: 'reason', message: 'event_not_completed' });
  });

  it('EC-03 ventana > 30 días ⇒ 403 window_expired', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking({ daysAgo: 31 });
    const res = await s.organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 4 });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toContainEqual({ field: 'reason', message: 'window_expired' });
  });

  it('EC-04 rating fuera de 1..5 ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    for (const rating of [0, 6, 3.5]) {
      const res = await s.organizer
        .post('/api/v1/organizer/reviews')
        .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating });
      expect(res.status, `rating=${rating}`).toBe(400);
      expect(res.body.error.code, `rating=${rating}`).toBe('VALIDATION_ERROR');
    }
  });

  it('EC-05 comment > 2000 chars ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const res = await s.organizer.post('/api/v1/organizer/reviews').send({
      event_id: s.eventId,
      vendor_profile_id: s.vendorProfileId,
      rating: 4,
      comment: 'x'.repeat(2001),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('EC-06 event inexistente ⇒ 404 RESOURCE_NOT_FOUND uniforme', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const vpUser = await registerLogin('vendor');
    const vp = await prisma.vendorProfile.create({
      data: {
        userId: vpUser.userId,
        businessName: `Vendor ${rnd()}`,
        status: 'approved',
        languagesSupported: ['es-LATAM'],
      },
    });
    const res = await organizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: UUID, vendor_profile_id: vp.id, rating: 4 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('EC-07 organizer ajeno ⇒ 404 uniforme (masking, sin diferencia con EC-06)', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const { agent: otherOrganizer } = await registerLogin('organizer');
    const res = await otherOrganizer
      .post('/api/v1/organizer/reviews')
      .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 4 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('AUTH-TS-04 vendor ⇒ 403 FORBIDDEN', async () => {
    const { agent: vendor } = await registerLogin('vendor');
    const res = await vendor
      .post('/api/v1/organizer/reviews')
      .send({ event_id: UUID, vendor_profile_id: UUID, rating: 4 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-06 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app)
      .post('/api/v1/organizer/reviews')
      .send({ event_id: UUID, vendor_profile_id: UUID, rating: 4 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('QA-005 concurrencia: 2 POST simultáneos — uno gana (201), otro 403 already_reviewed', async () => {
    const s = await scenarioCompletedEventWithConfirmedBooking();
    const [r1, r2] = await Promise.all([
      s.organizer
        .post('/api/v1/organizer/reviews')
        .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 5, comment: 'A' }),
      s.organizer
        .post('/api/v1/organizer/reviews')
        .send({ event_id: s.eventId, vendor_profile_id: s.vendorProfileId, rating: 3, comment: 'B' }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    // Uno debe ganar (201) y el otro caer en 403 already_reviewed. Ambos entre 201 y 403.
    expect(statuses).toEqual([201, 403]);
    const loser = r1.status === 403 ? r1 : r2;
    expect(loser.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
    expect(loser.body.error.details).toContainEqual({ field: 'reason', message: 'already_reviewed' });

    // Solo una review persiste en BD.
    const count = await prisma.review.count({
      where: { bookingIntentId: s.bookingIntentId, deletedAt: null },
    });
    expect(count).toBe(1);
  });

  it('QA-006 FR-REVIEW-007: no existen endpoints PATCH ni DELETE /organizer/reviews/:id (404 natural)', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const patchRes = await organizer.patch(`/api/v1/organizer/reviews/${UUID}`).send({ rating: 5 });
    expect(patchRes.status).toBe(404);
    const deleteRes = await organizer.delete(`/api/v1/organizer/reviews/${UUID}`);
    expect(deleteRes.status).toBe(404);
  });
});
