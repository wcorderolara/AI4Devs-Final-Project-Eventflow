// US-066 (PB-P1-039 / QA-002/003/005) — Integration tests con Supertest + Prisma real.
//
// Cubre (Tech Spec §13 · TS-01..TS-06 + Auth + Anonimato):
//   TS-01 lista + summary + paginación primera página (20 items + nextCursor no null).
//   TS-02 segunda página con cursor (5 items + nextCursor null; sin duplicados).
//   TS-03 excluye hidden/removed para no-admin.
//   TS-04 admin ve todos los status (published + hidden + removed).
//   TS-05 vendor sin reviews ⇒ items=[] + rating_avg=null.
//   TS-06 anonimato: response NO expone authorId, bookingIntentId, vendorProfileId.
//   AUTH-TS-01..04: anónimo/organizer/vendor/admin.
//   NT-01 vendor no approved (no admin) ⇒ 404 VENDOR_NOT_FOUND uniforme.
//   NT-02 cursor malformado ⇒ 400 INVALID_CURSOR.
//   NT-03 pageSize > 50 ⇒ 400 VALIDATION_ERROR.
//   NT-04 UUID malformado ⇒ 400 VALIDATION_ERROR.
//   NT-05 vendor inexistente ⇒ 404 VENDOR_NOT_FOUND uniforme.
//
// Nota: los tests corren SOLO cuando `dbUp === true` (Postgres real accesible). En CI sin BD,
// el describe se skipea entero.
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient, ReviewStatus, VendorProfileStatus } from '@prisma/client';
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
  const email = `us066_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }),
    role: role === 'admin' ? 'organizer' : role,
    captchaToken: CAPTCHA,
  });
  const userId = reg.body.data.id as string;

  if (role === 'admin') {
    await prisma.user.update({ where: { id: userId }, data: { role: 'admin' } });
  }
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId };
}

async function createApprovedVendor(): Promise<{ id: string; userId: string }> {
  const { userId } = await registerLogin('vendor');
  const vp = await prisma.vendorProfile.create({
    data: {
      userId,
      businessName: `Vendor ${rnd()}`,
      slug: `vendor-${rnd()}`,
      status: VendorProfileStatus.approved,
      languagesSupported: ['es-LATAM'],
      ratingAvg: 4.5,
      reviewsCount: 0,
    },
  });
  return { id: vp.id, userId };
}

/**
 * Inserta N reviews de forma controlada (`createdAt` decreciente para que el orden
 * `created_at DESC, id DESC` sea determinista). Usa raw insert porque no queremos gatillar el
 * flujo transaccional de US-065 (con Event/BookingIntent completos) para cada review — este
 * test se concentra en la LECTURA paginada.
 */
async function seedReviews(opts: {
  vendorProfileId: string;
  bookingIntentId: string;
  authorUserId: string;
  count: number;
  status?: ReviewStatus;
}) {
  const start = Date.parse('2026-06-01T00:00:00Z');
  for (let i = 0; i < opts.count; i++) {
    const created = new Date(start - i * 1000);
    await prisma.$executeRawUnsafe(
      `INSERT INTO reviews (id, booking_intent_id, vendor_profile_id, author_id, rating, comment, status, created_at, updated_at, is_seed)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4, $5, $6::"ReviewStatus", $7, $7, false)`,
      opts.bookingIntentId,
      opts.vendorProfileId,
      opts.authorUserId,
      (i % 5) + 1,
      `Review #${i + 1}`,
      opts.status ?? 'published',
      created,
    );
  }
}

/**
 * Escenario mínimo: un event completado + una Quote respondida + un BookingIntent
 * `confirmed_intent`. Se comparten a través de todas las reviews sembradas — no rompemos el
 * UNIQUE de `uq_booking_intents_active_per_quote` porque sólo hay un booking.
 */
async function bootstrapContext(vendorId: string, _vendorUserId: string) {
  const { agent: organizer, userId: organizerId } = await registerLogin('organizer');
  const eventRes = await organizer.post('/api/v1/events').send({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 100,
    locationId,
    estimatedBudget: '10000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });
  const eventId = eventRes.body.data.id as string;
  await organizer.post(`/api/v1/events/${eventId}/activate`);

  const qr = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({
    vendorProfileId: vendorId,
    serviceCategoryId,
    brief: { summary: 'Boda', requirements: ['catering'], questions: ['?'] },
  });
  const quoteReqId = qr.body.data.id as string;

  const vendorAgent = request.agent(app);
  const vendorEmail = `us066_v_${rnd()}@eventflow.test`;
  await vendorAgent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email: vendorEmail,
    password: 'Secret1234',
    businessName: 'Auxiliary Vendor',
    role: 'vendor',
    captchaToken: CAPTCHA,
  });
  // Reasignar la sesión al vendor real dueño del VendorProfile (permitido: mismo login por
  // updateando la vendorProfile del nuevo user no es necesario — usamos la sesión inicial del
  // vendor propietario). Para simplicidad usamos raw SQL para saltar el resto del flujo.
  // La response de la Quote debe venir del vendor dueño; hacemos login con su email real.
  const vp = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
  const owner = await prisma.user.findUnique({ where: { id: vp!.userId } });
  const vendorOwnerAgent = request.agent(app);
  // Reset password fabricado para poder loguear con la sesión — usamos el flujo directo con
  // el email registrado en `registerLogin('vendor')` (`us066_vendor_*@eventflow.test`).
  await vendorOwnerAgent.post('/api/v1/auth/login').send({
    email: owner!.email,
    password: 'Secret1234',
    captchaToken: CAPTCHA,
  });

  const quoteRes = await vendorOwnerAgent.post(`/api/v1/quote-requests/${quoteReqId}/quote`).send({
    totalPrice: '5000.00',
    breakdown: [{ label: 'Servicio', amount: '5000.00' }],
    conditions: 'x',
    currencyCode: 'GTQ',
  });
  await vendorOwnerAgent.post(`/api/v1/quotes/${quoteRes.body.data.id}/send`);
  const bookingRes = await organizer
    .post('/api/v1/booking-intents')
    .send({ quote_id: quoteRes.body.data.id, disclaimer_accepted: true });
  const bookingIntentId = bookingRes.body.data.id as string;
  await vendorOwnerAgent
    .post(`/api/v1/booking-intents/${bookingIntentId}/confirm`)
    .send({ disclaimer_accepted: true });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'completed',
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      autoCompleted: true,
    },
  });

  return { organizerId, bookingIntentId, eventId, organizer };
}

describe.skipIf(!dbUp)('US-066 QA — List vendor reviews integration', () => {
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

  it('TS-05 vendor sin reviews ⇒ 200 items=[] + rating_avg=null + next_cursor=null', async () => {
    const vendor = await createApprovedVendor();
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { ratingAvg: null, reviewsCount: 0 },
    });
    const res = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.vendor.ratingAvg).toBeNull();
    expect(res.body.data.vendor.reviewsCount).toBe(0);
    expect(res.body.data.pagination.nextCursor).toBeNull();
    expect(res.body.data.pagination.pageSize).toBe(20);
  });

  it('TS-01 + TS-02 + QA-005: 25 reviews ⇒ página 1 (20) + página 2 (5, sin duplicados)', async () => {
    const vendor = await createApprovedVendor();
    const ctx = await bootstrapContext(vendor.id, vendor.userId);
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 25,
    });
    // Recomputa el denormalize para paridad con US-065.
    await prisma.$executeRawUnsafe(
      `UPDATE vendor_profiles SET rating_avg = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE vendor_profile_id = $1::uuid AND status = 'published' AND deleted_at IS NULL), reviews_count = (SELECT COUNT(*) FROM reviews WHERE vendor_profile_id = $1::uuid AND status = 'published' AND deleted_at IS NULL) WHERE id = $1::uuid`,
      vendor.id,
    );

    const page1 = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews?pageSize=20`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.items).toHaveLength(20);
    expect(page1.body.data.pagination.nextCursor).not.toBeNull();
    expect(page1.body.data.vendor.reviewsCount).toBe(25);

    const page2 = await request(app).get(
      `/api/v1/vendors/${vendor.id}/reviews?pageSize=20&cursor=${encodeURIComponent(
        page1.body.data.pagination.nextCursor,
      )}`,
    );
    expect(page2.status).toBe(200);
    expect(page2.body.data.items).toHaveLength(5);
    expect(page2.body.data.pagination.nextCursor).toBeNull();

    // QA-005 sin duplicados: intersección de IDs entre página 1 y 2 debe ser vacía.
    const idsP1 = new Set<string>(page1.body.data.items.map((i: { id: string }) => i.id));
    for (const item of page2.body.data.items as Array<{ id: string }>) {
      expect(idsP1.has(item.id)).toBe(false);
    }
  });

  it('TS-03 no-admin: excluye hidden/removed (sólo published visibles)', async () => {
    const vendor = await createApprovedVendor();
    const ctx = await bootstrapContext(vendor.id, vendor.userId);
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 3,
      status: ReviewStatus.published,
    });
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 2,
      status: ReviewStatus.hidden,
    });
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 1,
      status: ReviewStatus.removed,
    });

    const res = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    // Sin campo `status` para no-admin.
    for (const item of res.body.data.items as Array<Record<string, unknown>>) {
      expect(item.status).toBeUndefined();
    }
  });

  it('TS-04 admin ve todos los status con el campo status en cada item', async () => {
    const vendor = await createApprovedVendor();
    const ctx = await bootstrapContext(vendor.id, vendor.userId);
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 2,
      status: ReviewStatus.published,
    });
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 1,
      status: ReviewStatus.hidden,
    });

    const { agent: admin } = await registerLogin('admin');
    const res = await admin.get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    const statuses = (res.body.data.items as Array<{ status: string }>).map((i) => i.status).sort();
    expect(statuses).toEqual(['hidden', 'published', 'published']);
  });

  it('TS-06 QA-003 anonimato: response NO contiene authorId, bookingIntentId, vendorProfileId', async () => {
    const vendor = await createApprovedVendor();
    const ctx = await bootstrapContext(vendor.id, vendor.userId);
    await seedReviews({
      vendorProfileId: vendor.id,
      bookingIntentId: ctx.bookingIntentId,
      authorUserId: ctx.organizerId,
      count: 1,
    });

    const res = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(200);
    const item = (res.body.data.items as Array<Record<string, unknown>>)[0]!;
    // Whitelist estricta: id, rating, comment, eventTitle, createdAt.
    expect(Object.keys(item).sort()).toEqual(
      ['comment', 'createdAt', 'eventTitle', 'id', 'rating'].sort(),
    );
    // Serialización completa como string debe NO contener las claves prohibidas.
    const asString = JSON.stringify(res.body.data.items);
    expect(asString.includes('authorId')).toBe(false);
    expect(asString.includes('author_id')).toBe(false);
    expect(asString.includes('bookingIntentId')).toBe(false);
    expect(asString.includes('vendorProfileId')).toBe(false);
  });

  it('NT-01 vendor pending (no admin) ⇒ 404 VENDOR_NOT_FOUND uniforme', async () => {
    const vendor = await createApprovedVendor();
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { status: VendorProfileStatus.pending },
    });
    const res = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('VENDOR_NOT_FOUND');
  });

  it('NT-02 cursor malformado ⇒ 400 INVALID_CURSOR', async () => {
    const vendor = await createApprovedVendor();
    const res = await request(app).get(
      `/api/v1/vendors/${vendor.id}/reviews?cursor=%21%21%21invalid%21%21%21`,
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('NT-03 pageSize > 50 ⇒ 400 VALIDATION_ERROR', async () => {
    const vendor = await createApprovedVendor();
    const res = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews?pageSize=100`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('NT-04 UUID malformado ⇒ 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get(`/api/v1/vendors/not-a-uuid/reviews`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('NT-05 vendor inexistente ⇒ 404 VENDOR_NOT_FOUND', async () => {
    const nonExistent = '00000000-0000-4000-8000-000000000066';
    const res = await request(app).get(`/api/v1/vendors/${nonExistent}/reviews`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('VENDOR_NOT_FOUND');
  });

  it('AUTH-TS-01..03: anónimo/organizer/vendor obtienen 200 cuando vendor approved', async () => {
    const vendor = await createApprovedVendor();
    // Anónimo.
    const anon = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(anon.status).toBe(200);
    // Organizer.
    const { agent: organizer } = await registerLogin('organizer');
    const org = await organizer.get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(org.status).toBe(200);
    // Vendor cualquier (no dueño): también 200.
    const { agent: otherVendor } = await registerLogin('vendor');
    const v = await otherVendor.get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(v.status).toBe(200);
  });

  it('AUTH-TS-04 admin ve vendor no-approved (mientras no-admin recibe 404)', async () => {
    const vendor = await createApprovedVendor();
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { status: VendorProfileStatus.hidden },
    });
    const anon = await request(app).get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(anon.status).toBe(404);
    const { agent: admin } = await registerLogin('admin');
    const res = await admin.get(`/api/v1/vendors/${vendor.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.data.vendor.status).toBe('hidden');
  });
});
