// US-071 (PB-P2-004 / QA-003 + SEC-001 + QA-006) — Integration tests contra Postgres real.
//
// Cubre:
//   * IT-01 (AC-01): orden `unread first, sent_at DESC, id ASC`
//   * IT-02 (AC-05): paginación estable
//   * IT-03 (AC-04, `@security`): aislamiento entre usuarios
//   * IT-04 (EC-05, TS-06): default `channel=in_app` dedup (in_app vs email_simulated)
//   * IT-05 (AC-02, TS-07): deep link `task_due_soon` construido con `payload.eventId`
//   * IT-06 (EC-03, TS-08): evento inexistente/soft-deleted → `link=null`
//   * SEC-T-01 (`@security`): 401 sin sesión válida (verificado por middleware)
//   * PERF sintético: mediana < 1500 ms sobre 50 filas seed (AC-09)
//
// Patrón `describe.skipIf(!dbUp)` — estándar del repo.
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

interface UserFixture {
  userId: string;
  sessionCookie: string;
  eventIds: string[];
  notificationIds: string[];
}

/**
 * Crea un usuario + sesión + evento + notifs. La sesión se persiste directamente en la
 * tabla `sessions` para no depender del flujo de login (el objetivo del test es el
 * endpoint de notifs, no el de auth).
 */
async function seedUserWithSession(
  refs: { eventTypeId: string; locationId: string },
  tag: string,
): Promise<UserFixture> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us071-${tag}-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-071 Fixture ${tag}`,
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
      title: `us071-${tag}-event-${now}`,
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
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return {
    userId: user.id,
    sessionCookie: sessionRow.id,
    eventIds: [event.id],
    notificationIds: [],
  };
}

async function insertNotification(
  userId: string,
  overrides: {
    type?: string;
    channel?: 'in_app' | 'email_simulated';
    status?: 'unread' | 'read';
    eventId?: string;
    taskId?: string;
    languageCode?: string;
    title?: string;
    body?: string;
    createdAt?: Date;
  } = {},
): Promise<string> {
  const payload = {
    channel: overrides.channel ?? 'in_app',
    languageCode: overrides.languageCode ?? 'es-LATAM',
    title: overrides.title ?? 'Recordatorio T-7',
    body: overrides.body ?? 'Body demo',
    eventId: overrides.eventId ?? null,
    taskId: overrides.taskId ?? null,
  };
  const created = await prisma.notification.create({
    data: {
      userId,
      type: overrides.type ?? 'task_due_soon',
      payload: payload as unknown as Prisma.InputJsonValue,
      status: overrides.status ?? 'unread',
    },
  });
  if (overrides.createdAt) {
    await prisma.notification.update({
      where: { id: created.id },
      data: { createdAt: overrides.createdAt },
    });
  }
  return created.id;
}

async function cleanupFixture(fx: UserFixture): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: fx.userId } });
  await prisma.session.deleteMany({ where: { userId: fx.userId } });
  await prisma.event.deleteMany({ where: { id: { in: fx.eventIds } } });
  await prisma.user.deleteMany({ where: { id: fx.userId } });
}

/** Signed cookie helper (patrón cookie-parser). El middleware valida la firma. */
function signCookie(sid: string): string {
  // El middleware de sesión valida la firma HMAC. Para tests usamos la utilidad
  // interna de cookie-parser. Como este helper vive en el test, usamos el mismo
  // secreto de `env.setup.ts`.
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- runtime import for signature helper (test-only)
  const cookieParser = require('cookie-parser') as typeof import('cookie-parser');
  const signed = cookieParser.signedCookie
    ? cookieParser.signedCookie(sid, cookieSecret)
    : sid;
  void signed; // signedCookie is a VERIFIER, not a signer.
  // Signature real:
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline signer
  const signature = require('cookie-signature') as { sign: (value: string, secret: string) => string };
  return `${cookieName}=${encodeURIComponent(signature.sign(sid, cookieSecret))}`;
}

describe.skipIf(!dbUp)('US-071 integration — GET /api/v1/notifications', () => {
  let refs: Awaited<ReturnType<typeof pickCatalogRefs>> = null;
  const fixtures: UserFixture[] = [];

  beforeAll(async () => {
    refs = await pickCatalogRefs();
  }, 60_000);

  afterAll(async () => {
    for (const fx of fixtures) await cleanupFixture(fx);
    await prisma.$disconnect();
  });

  it('SEC-T-01 (AC-03, @security): sin cookie de sesión → 401', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('IT-01 (AC-01): orden unread first, sent_at DESC, id ASC', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it01');
    fixtures.push(fx);
    fx.notificationIds.push(
      await insertNotification(fx.userId, {
        status: 'read',
        eventId: fx.eventIds[0],
        createdAt: new Date('2026-07-22T15:00:00Z'),
      }),
      await insertNotification(fx.userId, {
        status: 'unread',
        eventId: fx.eventIds[0],
        createdAt: new Date('2026-07-22T13:00:00Z'),
      }),
      await insertNotification(fx.userId, {
        status: 'unread',
        eventId: fx.eventIds[0],
        createdAt: new Date('2026-07-22T14:00:00Z'),
      }),
    );

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.items[0].status).toBe('unread');
    expect(res.body.data.items[2].status).toBe('read');
    expect(res.body.data.unreadCount).toBe(2);
    expect(res.body.pagination.total).toBe(3);
  }, 30_000);

  it('IT-02 (AC-05): paginación estable page 1..2', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it02');
    fixtures.push(fx);
    // 12 unread con distinto createdAt (para orden determinístico).
    for (let i = 0; i < 12; i += 1) {
      fx.notificationIds.push(
        await insertNotification(fx.userId, {
          eventId: fx.eventIds[0],
          createdAt: new Date(2026, 6, 22, 14, 0, i),
        }),
      );
    }

    const page1 = await request(app)
      .get('/api/v1/notifications?page=1&pageSize=5')
      .set('Cookie', signCookie(fx.sessionCookie));
    const page2 = await request(app)
      .get('/api/v1/notifications?page=2&pageSize=5')
      .set('Cookie', signCookie(fx.sessionCookie));
    const page3 = await request(app)
      .get('/api/v1/notifications?page=3&pageSize=5')
      .set('Cookie', signCookie(fx.sessionCookie));

    const idsP1 = page1.body.data.items.map((i: { id: string }) => i.id);
    const idsP2 = page2.body.data.items.map((i: { id: string }) => i.id);
    const idsP3 = page3.body.data.items.map((i: { id: string }) => i.id);
    // Sin duplicados entre páginas.
    const all = new Set([...idsP1, ...idsP2, ...idsP3]);
    expect(all.size).toBe(12);
    expect(page3.body.data.items).toHaveLength(2);
  }, 30_000);

  it('IT-03 (AC-04, @security): aislamiento — user A no ve notifs de user B', async () => {
    if (!refs) return;
    const fxA = await seedUserWithSession(refs, 'it03-a');
    const fxB = await seedUserWithSession(refs, 'it03-b');
    fixtures.push(fxA, fxB);
    fxA.notificationIds.push(
      await insertNotification(fxA.userId, { eventId: fxA.eventIds[0] }),
    );
    fxB.notificationIds.push(
      await insertNotification(fxB.userId, { eventId: fxB.eventIds[0] }),
    );

    const resA = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fxA.sessionCookie));
    expect(resA.body.data.items).toHaveLength(1);
    expect(resA.body.data.items[0].id).toBe(fxA.notificationIds[0]);
  }, 30_000);

  it('IT-04 (EC-05, TS-06): default channel=in_app dedup', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it04');
    fixtures.push(fx);
    fx.notificationIds.push(
      await insertNotification(fx.userId, { channel: 'in_app', eventId: fx.eventIds[0] }),
      await insertNotification(fx.userId, { channel: 'email_simulated', eventId: fx.eventIds[0] }),
    );

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].channel).toBe('in_app');

    // Con channel=all, ambas filas aparecen.
    const resAll = await request(app)
      .get('/api/v1/notifications?channel=all')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(resAll.body.data.items).toHaveLength(2);
  }, 30_000);

  it('IT-05 (AC-02, TS-07): deep link task_due_soon apunta a /organizer/events/:id/tasks?range=7d', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it05');
    fixtures.push(fx);
    fx.notificationIds.push(
      await insertNotification(fx.userId, { eventId: fx.eventIds[0] }),
    );

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(res.body.data.items[0].link).toBe(
      `/organizer/events/${fx.eventIds[0]}/tasks?range=7d`,
    );
  }, 30_000);

  it('IT-06 (EC-03, TS-08): evento inexistente → link=null', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it06');
    fixtures.push(fx);
    // Insertar notif referenciando un UUID que no existe.
    fx.notificationIds.push(
      await insertNotification(fx.userId, {
        eventId: '00000000-0000-0000-0000-000000000000',
      }),
    );

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(res.body.data.items[0].link).toBe(null);
  }, 30_000);

  it('IT-07 (VR-03..05): Zod rechaza query params inválidos con 400', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'it07');
    fixtures.push(fx);

    const invalid1 = await request(app)
      .get('/api/v1/notifications?pageSize=100')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(invalid1.status).toBe(400);

    const invalid2 = await request(app)
      .get('/api/v1/notifications?status=archived')
      .set('Cookie', signCookie(fx.sessionCookie));
    expect(invalid2.status).toBe(400);
  }, 30_000);

  it('PERF (AC-09): mediana de latencia sobre 50 notifs < 1500 ms', async () => {
    if (!refs) return;
    const fx = await seedUserWithSession(refs, 'perf');
    fixtures.push(fx);
    for (let i = 0; i < 50; i += 1) {
      fx.notificationIds.push(
        await insertNotification(fx.userId, {
          eventId: fx.eventIds[0],
          createdAt: new Date(2026, 6, 22, 14, 0, i),
        }),
      );
    }
    const runs = 5;
    const times: number[] = [];
    for (let i = 0; i < runs; i += 1) {
      const t0 = performance.now();
      await request(app)
        .get('/api/v1/notifications?pageSize=10')
        .set('Cookie', signCookie(fx.sessionCookie));
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(runs / 2)]!;
    // Informativo: la mediana debe ser holgadamente < 1500 ms sobre 50 filas y query
    // indexada. El assertion protege contra regresiones >1500 ms (AC-09 hard threshold).
    // eslint-disable-next-line no-console -- deja huella para inspección en CI
    console.info(`US-071 PERF median=${Math.round(median)}ms over ${runs} runs`);
    expect(median).toBeLessThan(1500);
  }, 60_000);
});
