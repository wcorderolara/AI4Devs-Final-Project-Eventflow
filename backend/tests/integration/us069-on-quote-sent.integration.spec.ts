// US-069 (PB-P2-006 / QA-002 + QA-003) — Integration tests contra Postgres real.
//
// Cubre (con `describe.skipIf(!dbUp)` — estándar del repo):
//   * IT-01 (AC-01): POST /api/v1/vendor/quote-requests/:id/respond crea 2 filas
//     `notifications(type='quote_received')` para el organizer dueño de la QR.
//   * IT-03 (AC-03, `@security`): aislamiento entre 2 organizers distintos.
//   * IT-04 (AC-04): preferredLanguage=pt del organizer → languageCode=pt en payload.
//   * IT-06 (AC-07): Quote persistida pero no en `sent` no dispara emisión (guard defensivo
//     se ejercita a nivel unit; a nivel HTTP la persistencia SIEMPRE llega con `sent`).
//   * IT-07 (AC-05): payload contiene set exacto de claves permitidas (SEC-02, no-PII).
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
  };
}

interface OrganizerFixture {
  userId: string;
  sessionCookie: string;
  eventId: string;
  quoteRequestId: string;
}

interface VendorFixture {
  userId: string;
  vendorProfileId: string;
  sessionCookie: string;
}

async function seedOrganizerWithQuoteRequest(
  refs: { eventTypeId: string; locationId: string; serviceCategoryId: string },
  vendorProfileId: string,
  tag: string,
  overrides: { preferredLanguage?: 'es_LATAM' | 'pt' | 'en' | 'es_ES' } = {},
): Promise<OrganizerFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us069-${tag}-org-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-069 Org ${tag}`,
      role: 'organizer',
      status: 'active',
      preferredLanguage: overrides.preferredLanguage ?? 'es_LATAM',
    },
  });
  const event = await prisma.event.create({
    data: {
      userId: user.id,
      eventTypeId: refs.eventTypeId,
      locationId: refs.locationId,
      title: `us069-${tag}-event-${now}`,
      status: 'active',
      currency: 'GTQ',
      language: 'es_LATAM',
      eventDate: new Date('2030-01-01T00:00:00Z'),
      guestsCount: 10,
      estimatedBudget: new Prisma.Decimal('100'),
      isSeed: false,
    },
  });
  const qr = await prisma.quoteRequest.create({
    data: {
      eventId: event.id,
      serviceCategoryId: refs.serviceCategoryId,
      vendorProfileId,
      status: 'sent',
      brief: {
        budget: '100.00',
        currency_code: 'GTQ',
        message: 'test',
        source: 'manual',
        aiGenerated: false,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  const sessionRow = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return {
    userId: user.id,
    sessionCookie: sessionRow.id,
    eventId: event.id,
    quoteRequestId: qr.id,
  };
}

async function seedVendor(tag: string): Promise<VendorFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us069-${tag}-vendor-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-069 Vendor ${tag}`,
      role: 'vendor',
      status: 'active',
      preferredLanguage: 'es_LATAM',
    },
  });
  const profile = await prisma.vendorProfile.create({
    data: {
      userId: user.id,
      businessName: `US-069 ${tag}`,
      status: 'approved',
    },
  });
  const sessionRow = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return {
    userId: user.id,
    vendorProfileId: profile.id,
    sessionCookie: sessionRow.id,
  };
}

function signCookie(sid: string): string {
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline signer (test-only)
  const signature = require('cookie-signature') as {
    sign: (value: string, secret: string) => string;
  };
  return `${cookieName}=${encodeURIComponent(signature.sign(sid, cookieSecret))}`;
}

const validRespondBody = {
  total_price: '150.00',
  breakdown: [
    { label: 'A', amount: '100.00' },
    { label: 'B', amount: '50.00' },
  ],
  conditions: 'nunca-en-payload-please',
};

async function cleanup(orgs: OrganizerFixture[], vendors: VendorFixture[]): Promise<void> {
  const userIds = [...orgs.map((o) => o.userId), ...vendors.map((v) => v.userId)];
  const qrIds = orgs.map((o) => o.quoteRequestId);
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.quote.deleteMany({ where: { quoteRequestId: { in: qrIds } } });
  await prisma.quoteRequest.deleteMany({ where: { id: { in: qrIds } } });
  await prisma.event.deleteMany({ where: { id: { in: orgs.map((o) => o.eventId) } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vendorProfile.deleteMany({
    where: { id: { in: vendors.map((v) => v.vendorProfileId) } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe.skipIf(!dbUp)(
  'US-069 integration — OnQuoteSentHandler via POST /api/v1/vendor/quote-requests/:id/respond',
  () => {
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

    it('IT-01 (AC-01): crea 2 notifs type=quote_received con payload rico para el organizer', async () => {
      if (!refs) return;
      const vendor = await seedVendor('it01');
      const org = await seedOrganizerWithQuoteRequest(refs, vendor.vendorProfileId, 'it01');
      vendors.push(vendor);
      orgs.push(org);

      const res = await request(app)
        .post(`/api/v1/vendor/quote-requests/${org.quoteRequestId}/respond`)
        .set('Cookie', signCookie(vendor.sessionCookie))
        .send(validRespondBody);
      expect(res.status).toBe(201);

      const notifs = await prisma.notification.findMany({
        where: { userId: org.userId, type: 'quote_received' },
      });
      expect(notifs).toHaveLength(2);
      const channels = notifs
        .map((n) => (n.payload as { channel: string }).channel)
        .sort();
      expect(channels).toEqual(['email_simulated', 'in_app']);
      for (const n of notifs) {
        const p = n.payload as {
          channel: string;
          quoteId: string;
          quoteRequestId: string;
          eventId: string;
          vendorProfileId: string;
          title: string;
          body: string;
          languageCode: string;
        };
        expect(p.quoteId).toBe(res.body.data.id);
        expect(p.quoteRequestId).toBe(org.quoteRequestId);
        expect(p.eventId).toBe(org.eventId);
        expect(p.vendorProfileId).toBe(vendor.vendorProfileId);
        expect(p.languageCode).toBe('es-LATAM');
        expect(p.title.length).toBeGreaterThan(0);
        expect(p.body.length).toBeGreaterThan(0);
      }
    }, 30_000);

    it('IT-03 (AC-03, @security): aislamiento — organizer A no ve notif del organizer B', async () => {
      if (!refs) return;
      const vendor = await seedVendor('it03');
      const orgA = await seedOrganizerWithQuoteRequest(refs, vendor.vendorProfileId, 'it03-a');
      const orgB = await seedOrganizerWithQuoteRequest(refs, vendor.vendorProfileId, 'it03-b');
      vendors.push(vendor);
      orgs.push(orgA, orgB);

      await request(app)
        .post(`/api/v1/vendor/quote-requests/${orgA.quoteRequestId}/respond`)
        .set('Cookie', signCookie(vendor.sessionCookie))
        .send(validRespondBody);

      const notifsA = await prisma.notification.count({
        where: { userId: orgA.userId, type: 'quote_received' },
      });
      const notifsB = await prisma.notification.count({
        where: { userId: orgB.userId, type: 'quote_received' },
      });
      expect(notifsA).toBe(2);
      expect(notifsB).toBe(0);
    }, 30_000);

    it('IT-04 (AC-04): preferredLanguage=pt del organizer → languageCode=pt', async () => {
      if (!refs) return;
      const vendor = await seedVendor('it04');
      const org = await seedOrganizerWithQuoteRequest(
        refs,
        vendor.vendorProfileId,
        'it04',
        { preferredLanguage: 'pt' },
      );
      vendors.push(vendor);
      orgs.push(org);

      await request(app)
        .post(`/api/v1/vendor/quote-requests/${org.quoteRequestId}/respond`)
        .set('Cookie', signCookie(vendor.sessionCookie))
        .send(validRespondBody);

      const notifs = await prisma.notification.findMany({
        where: { userId: org.userId, type: 'quote_received' },
      });
      expect(notifs).toHaveLength(2);
      for (const n of notifs) {
        expect((n.payload as { languageCode: string }).languageCode).toBe('pt');
      }
    }, 30_000);

    it('IT-07 (AC-05): payload contiene EXACTAMENTE las claves esperadas (no-PII)', async () => {
      if (!refs) return;
      const vendor = await seedVendor('it07');
      const org = await seedOrganizerWithQuoteRequest(refs, vendor.vendorProfileId, 'it07');
      vendors.push(vendor);
      orgs.push(org);

      await request(app)
        .post(`/api/v1/vendor/quote-requests/${org.quoteRequestId}/respond`)
        .set('Cookie', signCookie(vendor.sessionCookie))
        .send(validRespondBody);

      const notif = await prisma.notification.findFirst({
        where: { userId: org.userId, type: 'quote_received' },
      });
      expect(notif).toBeDefined();
      const payload = notif!.payload as Record<string, unknown>;
      const allowedKeys = [
        'channel',
        'languageCode',
        'quoteId',
        'quoteRequestId',
        'eventId',
        'vendorProfileId',
        'title',
        'body',
      ].sort();
      expect(Object.keys(payload).sort()).toEqual(allowedKeys);
      // Claves prohibidas explícitamente por SEC-02:
      for (const forbidden of [
        'email',
        'displayName',
        'brief',
        'vendorName',
        'eventNotes',
        'totalPrice',
        'total_price',
        'breakdown',
      ]) {
        expect(payload).not.toHaveProperty(forbidden);
      }
      // Y ningún string dentro del payload contiene el mensaje libre del body/conditions.
      for (const value of Object.values(payload)) {
        if (typeof value === 'string') {
          expect(value.includes('nunca-en-payload-please')).toBe(false);
        }
      }
    }, 30_000);
  },
);
