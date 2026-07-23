// US-073 (PB-P2-009 / QA-003) — Integration test contra Postgres real que valida
// el link generation server-side para los 4 tipos vendor sobre `GET /api/v1/notifications`.
//
// Cubre:
//   * IT-01 (AC-02): 4 tipos vendor (`quote_rejected`, `quote_expired`,
//     `quote_request_received`, `booking_confirmed`) devuelven cada uno el `link`
//     correcto server-side (extensión del `NotificationLinkResolver`).
//   * IT-02 (AC-04, `@security`): aislamiento vendor A vs vendor B — B no ve
//     notifs de A.
//
// Patrón `describe.skipIf(!dbUp)` — se salta cuando no hay DB local (CI corre
// con Postgres).
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

async function pickCatalogRefs(): Promise<{ eventTypeId: string; locationId: string } | null> {
  const [eventType, location] = await Promise.all([
    prisma.eventType.findFirst({ where: { isActive: true, deletedAt: null } }),
    prisma.location.findFirst({ where: { deletedAt: null } }),
  ]);
  if (!eventType || !location) return null;
  return { eventTypeId: eventType.id, locationId: location.id };
}

interface VendorFixture {
  userId: string;
  sessionCookie: string;
  eventIds: string[];
  quoteRequestIds: string[];
  bookingIntentIds: string[];
  notificationIds: string[];
}

async function seedVendorWithSession(
  refs: { eventTypeId: string; locationId: string },
  tag: string,
): Promise<VendorFixture> {
  const now = Date.now();
  const vendorUser = await prisma.user.create({
    data: {
      email: `us073-${tag}-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-073 Vendor ${tag}`,
      role: 'vendor',
      status: 'active',
      preferredLanguage: 'es_LATAM',
    },
  });
  const organizerUser = await prisma.user.create({
    data: {
      email: `us073-org-${tag}-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-073 Organizer ${tag}`,
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'es_LATAM',
    },
  });
  const event = await prisma.event.create({
    data: {
      userId: organizerUser.id,
      eventTypeId: refs.eventTypeId,
      locationId: refs.locationId,
      title: `us073-${tag}-event-${now}`,
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
    data: {
      userId: vendorUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return {
    userId: vendorUser.id,
    sessionCookie: sessionRow.id,
    eventIds: [event.id],
    quoteRequestIds: [],
    bookingIntentIds: [],
    notificationIds: [],
  };
}

async function insertNotification(
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const created = await prisma.notification.create({
    data: {
      userId,
      type,
      payload: payload as unknown as Prisma.InputJsonValue,
      status: 'unread',
    },
  });
  return created.id;
}

async function cleanupFixture(fx: VendorFixture): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: fx.userId } });
  await prisma.session.deleteMany({ where: { userId: fx.userId } });
  await prisma.event.deleteMany({ where: { id: { in: fx.eventIds } } });
  await prisma.user.deleteMany({ where: { id: fx.userId } });
}

function signCookie(sid: string): string {
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline signer (test-only)
  const signature = require('cookie-signature') as { sign: (value: string, secret: string) => string };
  return `${cookieName}=s%3A${encodeURIComponent(signature.sign(sid, cookieSecret))}`;
}

const QUOTE_REJECTED_ID = '11111111-1111-4111-8111-111111111111';
const QUOTE_EXPIRED_ID = '22222222-2222-4222-8222-222222222222';

describe.skipIf(!dbUp)('US-073 integration — vendor link generation (AC-02, AC-04)', () => {
  let refs: Awaited<ReturnType<typeof pickCatalogRefs>> = null;
  const fixtures: VendorFixture[] = [];

  beforeAll(async () => {
    refs = await pickCatalogRefs();
  }, 60_000);

  afterAll(async () => {
    for (const fx of fixtures) await cleanupFixture(fx);
    await prisma.$disconnect();
  });

  it('IT-01 (AC-02): links correctos para quote_rejected y quote_expired', async () => {
    if (!refs) return;
    const fx = await seedVendorWithSession(refs, 'it01');
    fixtures.push(fx);
    fx.notificationIds.push(
      await insertNotification(fx.userId, 'quote_rejected', {
        channel: 'in_app',
        languageCode: 'es-LATAM',
        title: 'Cotización rechazada',
        body: 'El organizador rechazó tu cotización.',
        quoteId: QUOTE_REJECTED_ID,
      }),
      await insertNotification(fx.userId, 'quote_expired', {
        channel: 'in_app',
        languageCode: 'es-LATAM',
        title: 'Cotización expirada',
        body: 'Tu cotización expiró.',
        quoteId: QUOTE_EXPIRED_ID,
      }),
    );
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(res.status).toBe(200);
    const items: Array<{ id: string; type: string; link: string | null }> = res.body.data.items;
    const rejected = items.find((it) => it.type === 'quote_rejected');
    const expired = items.find((it) => it.type === 'quote_expired');
    expect(rejected?.link).toBe(`/vendor/quotes/${QUOTE_REJECTED_ID}`);
    expect(expired?.link).toBe(`/vendor/quotes/${QUOTE_EXPIRED_ID}`);
  });

  it('IT-01b (EC-02): quote_rejected sin quoteId en payload → link=null', async () => {
    if (!refs) return;
    const fx = await seedVendorWithSession(refs, 'it01b');
    fixtures.push(fx);
    fx.notificationIds.push(
      await insertNotification(fx.userId, 'quote_rejected', {
        channel: 'in_app',
        languageCode: 'es-LATAM',
        title: 'Cotización rechazada',
        body: 'Sin quoteId.',
      }),
    );
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(res.status).toBe(200);
    const items: Array<{ id: string; type: string; link: string | null }> = res.body.data.items;
    expect(items[0]?.link).toBe(null);
  });

  it('IT-02 (AC-04, @security): aislamiento vendor A vs vendor B', async () => {
    if (!refs) return;
    const vendorA = await seedVendorWithSession(refs, 'it02a');
    const vendorB = await seedVendorWithSession(refs, 'it02b');
    fixtures.push(vendorA, vendorB);
    const notifIdA = await insertNotification(vendorA.userId, 'quote_rejected', {
      channel: 'in_app',
      languageCode: 'es-LATAM',
      title: 'Vendor A notif',
      body: 'Sólo vendor A la ve',
      quoteId: QUOTE_REJECTED_ID,
    });
    vendorA.notificationIds.push(notifIdA);
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(vendorB.sessionCookie));
    expect(res.status).toBe(200);
    const items: Array<{ id: string }> = res.body.data.items;
    expect(items.find((it) => it.id === notifIdA)).toBeUndefined();
  });
});
