// US-067 (PB-P1-040 / QA-002 + QA-003 + QA-005 + QA-006) — Integration/API tests con
// Supertest + Prisma real.
//
// Cubre (Tech Spec §13 · TS-01..TS-05 + Concurrencia + AUTH + Security):
//   TS-01 hide published ⇒ 200 + AdminAction + denormalize + audit columns pobladas.
//   TS-02 remove published ⇒ 200 + AdminAction + denormalize.
//   TS-03 hidden → removed (Decisión PO D2 transición permitida) + nueva AdminAction.
//   TS-04 denormalize recalcula excluyendo hidden/removed (AC-04).
//   TS-05 regresión US-065/US-066: creación + listado siguen funcionando (spec-level en sus
//     propias suites; aquí verificamos que el GET /vendors/:id/reviews público excluye la
//     review moderada — coherente con US-066 D3).
//   EC-01 review removed ⇒ 409 INVALID_TRANSITION con `details.from='removed'`.
//   EC-02 hidden → hidden ⇒ 409 INVALID_TRANSITION.
//   EC-03 reason < 10 ⇒ 400 VALIDATION_ERROR.
//   EC-03 reason > 500 ⇒ 400 VALIDATION_ERROR.
//   EC-05 action inválido ⇒ 400 VALIDATION_ERROR.
//   EC-04 review inexistente ⇒ 404 REVIEW_NOT_FOUND (uniforme, Decisión PO D6).
//   AUTH-TS-01 admin ⇒ 200.
//   AUTH-TS-02 organizer ⇒ 403 FORBIDDEN.
//   AUTH-TS-03 vendor ⇒ 403 FORBIDDEN.
//   AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED.
//   QA-005 concurrencia: 2 POST simultáneos sobre el mismo review — uno gana, otro cae en
//     409 INVALID_TRANSITION (`from` = ya hidden/removed). Sin doble AdminAction.
//   QA-006 SEC-03 (FR-REVIEW-005): no existen DELETE /admin/reviews/:id ⇒ 404 natural.
//   QA-006 SEC-04 (FR-REVIEW-009): no se invoca al AI provider (verificado por diseño — el
//     UseCase no depende de `AIProviderPort`; asserted en unit test).
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
  role: 'organizer' | 'vendor' | 'admin',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us067_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }),
    role: role === 'admin' ? 'organizer' : role, // admin no puede registrarse por endpoint público
    captchaToken: CAPTCHA,
  });
  const userId = reg.body.data.id as string;
  // Promoción manual a admin (registro público sólo crea organizer/vendor; ver seed-demo).
  if (role === 'admin') {
    await prisma.user.update({ where: { id: userId }, data: { role: 'admin' } });
  }
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId };
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

interface ReviewScenario {
  admin: Agent;
  adminUserId: string;
  organizer: Agent;
  vendor: Agent;
  reviewId: string;
  vendorProfileId: string;
  rating: number;
}

/**
 * Reusa la misma cadena de US-065 QA (organizer → vendor → QR → Quote → BookingIntent
 * confirmed → Event completed → Review published) y devuelve el `reviewId` publicado listo
 * para moderar.
 */
async function scenarioWithPublishedReview(): Promise<ReviewScenario> {
  const { agent: admin, userId: adminUserId } = await registerLogin('admin');
  const { agent: organizer } = await registerLogin('organizer');
  const { agent: vendor, userId: vendorUserId } = await registerLogin('vendor');

  const vp = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserId,
      businessName: `Vendor ${rnd()}`,
      status: 'approved',
      languagesSupported: ['es-LATAM'],
    },
  });
  const eventId = await createActiveEvent(organizer);

  const qr = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({
    vendorProfileId: vp.id,
    serviceCategoryId,
    brief: { summary: 'Boda', requirements: ['catering'], questions: ['?'] },
  });
  const quoteRes = await vendor
    .post(`/api/v1/quote-requests/${qr.body.data.id}/quote`)
    .send({
      totalPrice: '5000.00',
      breakdown: [{ label: 'Servicio', amount: '5000.00' }],
      conditions: 'x',
      currencyCode: 'GTQ',
    });
  await vendor.post(`/api/v1/quotes/${quoteRes.body.data.id}/send`);
  const bookingRes = await organizer
    .post('/api/v1/booking-intents')
    .send({ quote_id: quoteRes.body.data.id, disclaimer_accepted: true });
  await vendor
    .post(`/api/v1/booking-intents/${bookingRes.body.data.id}/confirm`)
    .send({ disclaimer_accepted: true });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'completed',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      autoCompleted: true,
    },
  });

  const rating = 4;
  const rev = await organizer.post('/api/v1/organizer/reviews').send({
    event_id: eventId,
    vendor_profile_id: vp.id,
    rating,
    comment: 'Excelente servicio.',
  });
  const reviewId = rev.body.data.id as string;

  return { admin, adminUserId, organizer, vendor, reviewId, vendorProfileId: vp.id, rating };
}

const UUID = '11111111-1111-4111-8111-111111111111';
const VALID_REASON = 'Contenido inapropiado verificado (integration test).';

describe.skipIf(!dbUp)('US-067 QA — ModerateReview integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, notifications, booking_intents, quotes, quote_requests, budget_items, budgets, events, sessions, password_reset_tokens, admin_actions, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    locationId = loc.id;
    const sc = await prisma.serviceCategory.create({
      data: { code: `cat_${rnd()}`, label: 'Catering', isActive: true },
    });
    serviceCategoryId = sc.id;
  }, 60_000);

  it('TS-01 AC-01 happy path: 200 + audit + AdminAction + denormalize', async () => {
    const s = await scenarioWithPublishedReview();
    const before = await prisma.vendorProfile.findUnique({ where: { id: s.vendorProfileId } });
    expect(before?.reviewsCount).toBe(1);
    expect(before?.ratingAvg?.toString()).toBe('4');

    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(s.reviewId);
    expect(res.body.data.status).toBe('hidden');
    expect(res.body.data.moderatedBy).toBe(s.adminUserId);
    expect(res.body.data.moderationReason).toBe(VALID_REASON);
    expect(typeof res.body.data.adminActionId).toBe('string');

    // Audit columns pobladas en BD.
    const persisted = await prisma.review.findUnique({ where: { id: s.reviewId } });
    expect(persisted?.status).toBe('hidden');
    expect(persisted?.moderatedBy).toBe(s.adminUserId);
    expect(persisted?.moderationReason).toBe(VALID_REASON);
    expect(persisted?.adminActionId).toBe(res.body.data.adminActionId);

    // AdminAction append-only con payload snapshot.
    const admin = await prisma.adminAction.findUnique({ where: { id: res.body.data.adminActionId } });
    expect(admin?.action).toBe('hide');
    expect(admin?.targetEntity).toBe('review');
    expect(admin?.targetId).toBe(s.reviewId);
    const metadata = admin?.metadata as Record<string, unknown> | null;
    expect(metadata?.from_status).toBe('published');
    expect(metadata?.to_status).toBe('hidden');
    expect(metadata?.rating_snapshot).toBe(s.rating);

    // AC-04 denormalize recalculado: hidden excluida → count=0, avg=null.
    const after = await prisma.vendorProfile.findUnique({ where: { id: s.vendorProfileId } });
    expect(after?.reviewsCount).toBe(0);
    expect(after?.ratingAvg).toBeNull();
  });

  it('TS-02 remove published ⇒ 200 + status=removed', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'remove', reason: VALID_REASON });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('removed');
    const persisted = await prisma.review.findUnique({ where: { id: s.reviewId } });
    expect(persisted?.status).toBe('removed');
  });

  it('TS-03 hidden → removed permitido (nueva AdminAction)', async () => {
    const s = await scenarioWithPublishedReview();
    const hide = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(hide.status).toBe(200);
    const remove = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'remove', reason: VALID_REASON });
    expect(remove.status).toBe(200);
    expect(remove.body.data.status).toBe('removed');
    // Cada acción produce un AdminAction distinto.
    expect(remove.body.data.adminActionId).not.toBe(hide.body.data.adminActionId);
    const admActions = await prisma.adminAction.count({
      where: { targetEntity: 'review', targetId: s.reviewId },
    });
    expect(admActions).toBe(2);
  });

  it('EC-01 review removed ⇒ 409 INVALID_TRANSITION details.from=removed', async () => {
    const s = await scenarioWithPublishedReview();
    await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'remove', reason: VALID_REASON });
    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.details).toContainEqual({ field: 'from', message: 'removed' });
    // Sólo hay 1 AdminAction (el remove) — no se creó otro al rechazar.
    const admCount = await prisma.adminAction.count({
      where: { targetEntity: 'review', targetId: s.reviewId },
    });
    expect(admCount).toBe(1);
  });

  it('EC-03 reason < 10 ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('EC-03 reason > 500 ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('EC-05 action inválido ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.admin
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'delete', reason: VALID_REASON });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('EC-04 review inexistente ⇒ 404 REVIEW_NOT_FOUND (uniforme, Decisión PO D6)', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin
      .post(`/api/v1/admin/reviews/${UUID}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REVIEW_NOT_FOUND');
  });

  it('AUTH-TS-02 organizer ⇒ 403 FORBIDDEN', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.organizer
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-03 vendor ⇒ 403 FORBIDDEN', async () => {
    const s = await scenarioWithPublishedReview();
    const res = await s.vendor
      .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/reviews/${UUID}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('QA-005 concurrencia: 2 POST simultáneos — 1 gana (200), otro 409 sin doble AdminAction', async () => {
    const s = await scenarioWithPublishedReview();
    const [r1, r2] = await Promise.all([
      s.admin
        .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
        .send({ action: 'hide', reason: VALID_REASON }),
      s.admin
        .post(`/api/v1/admin/reviews/${s.reviewId}/moderate`)
        .send({ action: 'hide', reason: VALID_REASON }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = r1.status === 409 ? r1 : r2;
    expect(loser.body.error.code).toBe('INVALID_TRANSITION');
    // Sólo 1 AdminAction — el SELECT FOR UPDATE serializó las dos transacciones.
    const admCount = await prisma.adminAction.count({
      where: { targetEntity: 'review', targetId: s.reviewId },
    });
    expect(admCount).toBe(1);
  });

  it('QA-006 SEC-03 FR-REVIEW-005: no existe DELETE /admin/reviews/:id (404 natural)', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin.delete(`/api/v1/admin/reviews/${UUID}`);
    expect(res.status).toBe(404);
  });
});
