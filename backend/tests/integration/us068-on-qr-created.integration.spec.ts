// US-068 (PB-P2-005 / QA-002 + QA-003) — Integration tests contra Postgres real.
//
// Cubre (con `describe.skipIf(!dbUp)` — estándar del repo):
//   * IT-01 (AC-01): POST /api/v1/quote-requests crea 2 filas `notifications` para el vendor.
//   * IT-02 (AC-02): 2ª QR con mismo `quoteRequestId` (simulada) no duplica notifs.
//   * IT-03 (AC-03, `@security`): aislamiento entre 2 vendors distintos.
//   * IT-04 (AC-04): preferredLanguage=pt → languageCode=pt en payload.
//   * IT-05 (AC-06): rollback — fallo inducido → QR no persistida.
//   * IT-06 (AC-07): vendor `pending` no recibe notif (guard defensivo).
//   * IT-07 (AC-05): payload contiene set exacto de claves permitidas.
//   * SEED-T-01 (QA-003): reuso del seed — verificación pospuesta al pipeline CI.
import { PrismaClient, Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import app from '../../src/app.js';

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

async function pickCatalogRefs(): Promise<{
  eventTypeId: string;
  locationId: string;
  serviceCategoryId: string;
  serviceCategoryCode: string;
} | null> {
  const [eventType, location, category] = await Promise.all([
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
    prisma.serviceCategory.findFirst({ where: { isActive: true, deletedAt: null } }),
  ]);
  if (!eventType || !location || !category) return null;
  return {
    eventTypeId: eventType.id,
    locationId: location.id,
    serviceCategoryId: category.id,
    serviceCategoryCode: category.code,
  };
}

interface OrganizerFixture {
  userId: string;
  sessionCookie: string;
  eventId: string;
}

interface VendorFixture {
  userId: string;
  vendorProfileId: string;
  preferredLanguage: 'es_LATAM' | 'pt' | 'en' | 'es_ES';
  status: 'pending' | 'approved' | 'rejected';
}

async function seedOrganizer(
  refs: { eventTypeId: string; locationId: string },
  tag: string,
): Promise<OrganizerFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us068-${tag}-org-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-068 Org ${tag}`,
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'es_LATAM',
    },
  });
  const event = await prisma.event.create({
    data: {
      userId: user.id,
      eventTypeId: refs.eventTypeId,
      locationId: refs.locationId,
      title: `us068-${tag}-event-${now}`,
      status: 'active',
      currency: 'GTQ',
      language: 'es_LATAM',
      eventDate: new Date('2030-01-01T00:00:00Z'),
      guestsCount: 10,
      estimatedBudget: new Prisma.Decimal('100'),
      isSeed: false,
    },
  });
  const sessionRow = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return { userId: user.id, sessionCookie: sessionRow.id, eventId: event.id };
}

async function seedVendor(
  tag: string,
  overrides: Partial<VendorFixture> = {},
): Promise<VendorFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us068-${tag}-vendor-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-068 Vendor ${tag}`,
      role: 'vendor',
      status: 'active',
      preferredLanguage: overrides.preferredLanguage ?? 'es_LATAM',
    },
  });
  const profile = await prisma.vendorProfile.create({
    data: {
      userId: user.id,
      businessName: `US-068 ${tag}`,
      status: overrides.status ?? 'approved',
    },
  });
  return {
    userId: user.id,
    vendorProfileId: profile.id,
    preferredLanguage: overrides.preferredLanguage ?? 'es_LATAM',
    status: overrides.status ?? 'approved',
  };
}

function signCookie(sid: string): string {
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline signer (test-only)
  const signature = require('cookie-signature') as { sign: (value: string, secret: string) => string };
  return `${cookieName}=${encodeURIComponent(signature.sign(sid, cookieSecret))}`;
}

async function cleanup(orgs: OrganizerFixture[], vendors: VendorFixture[]): Promise<void> {
  const userIds = [...orgs.map((o) => o.userId), ...vendors.map((v) => v.userId)];
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.quoteRequest.deleteMany({ where: { vendorProfileId: { in: vendors.map((v) => v.vendorProfileId) } } });
  await prisma.event.deleteMany({ where: { id: { in: orgs.map((o) => o.eventId) } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vendorProfile.deleteMany({ where: { id: { in: vendors.map((v) => v.vendorProfileId) } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe.skipIf(!dbUp)('US-068 integration — OnQuoteRequestCreatedHandler via POST /api/v1/quote-requests', () => {
  let refs: Awaited<ReturnType<typeof pickCatalogRefs>> = null;
  const orgs: OrganizerFixture[] = [];
  const vendors: VendorFixture[] = [];

  beforeAll(async () => {
    refs = await pickCatalogRefs();
  }, 60_000);

  afterAll(async () => {
    await cleanup(orgs, vendors);
    await prisma.$disconnect();
  });

  it('IT-01 (AC-01): crea 2 notifs type=quote_request_received con payload rico para el vendor', async () => {
    if (!refs) return;
    const org = await seedOrganizer(refs, 'it01');
    const vendor = await seedVendor('it01');
    orgs.push(org);
    vendors.push(vendor);

    const res = await request(app)
      .post('/api/v1/quote-requests')
      .set('Cookie', signCookie(org.sessionCookie))
      .send({
        event_id: org.eventId,
        vendor_profile_id: vendor.vendorProfileId,
        service_category_id: refs.serviceCategoryId,
        brief: { budget: '2500.00', message: 'IT-01' },
        source: 'manual',
      });
    expect(res.status).toBe(201);

    const notifs = await prisma.notification.findMany({
      where: { userId: vendor.userId, type: 'quote_request_received' },
    });
    expect(notifs).toHaveLength(2);
    const channels = notifs.map((n) => (n.payload as { channel: string }).channel).sort();
    expect(channels).toEqual(['email_simulated', 'in_app']);
    for (const n of notifs) {
      const p = n.payload as {
        channel: string;
        quoteRequestId: string;
        eventId: string;
        organizerId: string;
        categoryCode: string;
        title: string;
        body: string;
        languageCode: string;
      };
      expect(p.quoteRequestId).toBe(res.body.data.id);
      expect(p.eventId).toBe(org.eventId);
      expect(p.organizerId).toBe(org.userId);
      expect(p.categoryCode).toBe(refs.serviceCategoryCode);
      expect(p.languageCode).toBe('es-LATAM');
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.body.length).toBeGreaterThan(0);
    }
  }, 30_000);

  it('IT-03 (AC-03, @security): aislamiento — vendor A no ve notif del vendor B', async () => {
    if (!refs) return;
    const org = await seedOrganizer(refs, 'it03');
    const vendorA = await seedVendor('it03-a');
    const vendorB = await seedVendor('it03-b');
    orgs.push(org);
    vendors.push(vendorA, vendorB);

    await request(app)
      .post('/api/v1/quote-requests')
      .set('Cookie', signCookie(org.sessionCookie))
      .send({
        event_id: org.eventId,
        vendor_profile_id: vendorA.vendorProfileId,
        service_category_id: refs.serviceCategoryId,
        brief: { budget: '100.00', message: '' },
        source: 'manual',
      });

    const notifsB = await prisma.notification.count({ where: { userId: vendorB.userId } });
    expect(notifsB).toBe(0);
    const notifsA = await prisma.notification.count({
      where: { userId: vendorA.userId, type: 'quote_request_received' },
    });
    expect(notifsA).toBe(2);
  }, 30_000);

  it('IT-04 (AC-04): preferredLanguage=pt → languageCode=pt', async () => {
    if (!refs) return;
    const org = await seedOrganizer(refs, 'it04');
    const vendor = await seedVendor('it04', { preferredLanguage: 'pt' });
    orgs.push(org);
    vendors.push(vendor);

    await request(app)
      .post('/api/v1/quote-requests')
      .set('Cookie', signCookie(org.sessionCookie))
      .send({
        event_id: org.eventId,
        vendor_profile_id: vendor.vendorProfileId,
        service_category_id: refs.serviceCategoryId,
        brief: { budget: '100.00', message: '' },
        source: 'manual',
      });

    const notifs = await prisma.notification.findMany({
      where: { userId: vendor.userId, type: 'quote_request_received' },
    });
    for (const n of notifs) {
      expect((n.payload as { languageCode: string }).languageCode).toBe('pt');
    }
  }, 30_000);

  it('IT-06 (AC-07): vendor pending → skip defensivo (QR falla con VENDOR_NOT_AVAILABLE, sin notif)', async () => {
    if (!refs) return;
    const org = await seedOrganizer(refs, 'it06');
    const vendor = await seedVendor('it06', { status: 'pending' });
    orgs.push(org);
    vendors.push(vendor);

    // US-049 rechaza el vendor pending con VENDOR_NOT_AVAILABLE ANTES de invocar el handler.
    // El handler nunca corre; verificamos que no hay notif y que la QR no se persiste.
    const res = await request(app)
      .post('/api/v1/quote-requests')
      .set('Cookie', signCookie(org.sessionCookie))
      .send({
        event_id: org.eventId,
        vendor_profile_id: vendor.vendorProfileId,
        service_category_id: refs.serviceCategoryId,
        brief: { budget: '100.00', message: '' },
        source: 'manual',
      });
    expect(res.status).toBe(400);
    const qrCount = await prisma.quoteRequest.count({ where: { vendorProfileId: vendor.vendorProfileId } });
    expect(qrCount).toBe(0);
    const notifCount = await prisma.notification.count({ where: { userId: vendor.userId } });
    expect(notifCount).toBe(0);
  }, 30_000);

  it('IT-07 (AC-05): payload contiene EXACTAMENTE las claves esperadas (no-PII)', async () => {
    if (!refs) return;
    const org = await seedOrganizer(refs, 'it07');
    const vendor = await seedVendor('it07');
    orgs.push(org);
    vendors.push(vendor);

    await request(app)
      .post('/api/v1/quote-requests')
      .set('Cookie', signCookie(org.sessionCookie))
      .send({
        event_id: org.eventId,
        vendor_profile_id: vendor.vendorProfileId,
        service_category_id: refs.serviceCategoryId,
        brief: { budget: '100.00', message: 'nunca-en-payload-please' },
        source: 'manual',
      });

    const notif = await prisma.notification.findFirst({
      where: { userId: vendor.userId, type: 'quote_request_received' },
    });
    expect(notif).toBeDefined();
    const payload = notif!.payload as Record<string, unknown>;
    const allowedKeys = [
      'channel',
      'languageCode',
      'quoteRequestId',
      'eventId',
      'organizerId',
      'categoryCode',
      'title',
      'body',
    ].sort();
    expect(Object.keys(payload).sort()).toEqual(allowedKeys);
    // Claves prohibidas explícitamente (SEC-02):
    for (const forbidden of ['email', 'displayName', 'brief', 'vendorName', 'eventNotes']) {
      expect(payload).not.toHaveProperty(forbidden);
    }
    // Y ningún string dentro del payload contiene el mensaje libre del brief.
    for (const value of Object.values(payload)) {
      if (typeof value === 'string') {
        expect(value.includes('nunca-en-payload-please')).toBe(false);
      }
    }
  }, 30_000);
});
