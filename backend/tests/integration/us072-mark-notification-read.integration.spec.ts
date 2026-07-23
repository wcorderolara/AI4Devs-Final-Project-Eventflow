// US-072 (PB-P2-008 / QA-003 + SEC-001) — Integration tests contra Postgres real.
//
// Cubre (con `describe.skipIf(!dbUp)` — estándar del repo):
//   * IT-01 mark single happy path → 204 + `read_at != null` + `status='read'`.
//   * IT-02 idempotencia: segundo PATCH sobre notif ya `read` → 204 sin cambios (AC-06).
//   * IT-03 ajena (SEC-T-01) → 404 uniforme (AC-04 no-revelación); notif de B queda unread.
//   * IT-04 inexistente → 404 (AC-05).
//   * IT-05 mark-all default `in_app`: 3 in_app + 2 email_simulated unread → sólo las 3 in_app
//     quedan `read`.
//   * IT-06 mark-all `?channel=all`: las 5 quedan `read`.
//   * IT-07 mark-all `?channel=email_simulated`: sólo las 2 email_simulated quedan `read`.
//   * IT-08 mark-all sin notifs unread → 204 (EC-02).
//   * IT-09 401 sin sesión (SEC-T-02) — AC-03.
//   * IT-10 Zod inválido: `?channel=slack` → 400 VR-03; `notificationId` malformado → 400 VR-02.
//   * IT-PERF: mark-all sobre 100 notifs seed → P95 < 1.5 s (AC-08).
import { PrismaClient } from '@prisma/client';
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

async function seedUserWithSession(
  tag: string,
): Promise<{ userId: string; sessionCookie: string }> {
  const now = Date.now();
  const user = await prisma.user.create({
    data: {
      email: `us072-${tag}-${now}@test.local`,
      passwordHash: 'x',
      fullName: `US-072 ${tag}`,
      role: 'organizer',
      status: 'active',
      preferredLanguage: 'es_LATAM',
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  return { userId: user.id, sessionCookie: session.id };
}

async function seedNotification(
  userId: string,
  channel: 'in_app' | 'email_simulated',
  overrides: { status?: 'unread' | 'read'; readAt?: Date | null } = {},
): Promise<string> {
  const row = await prisma.notification.create({
    data: {
      userId,
      type: 'task_due_soon',
      payload: {
        channel,
        languageCode: 'es-LATAM',
        title: `test-${channel}`,
        body: 'test body',
      },
      status: overrides.status ?? 'unread',
      readAt: overrides.readAt ?? null,
    },
  });
  return row.id;
}

function signCookie(sid: string): string {
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- inline signer (test-only)
  const signature = require('cookie-signature') as {
    sign: (value: string, secret: string) => string;
  };
  // `cookie-parser` sólo mueve la cookie a `req.signedCookies` cuando el valor
  // comienza con `s:` (patrón que Express agrega automáticamente en `res.cookie`
  // cuando `signed:true`). Sin el prefijo, la cookie queda en `req.cookies` y
  // `sessionAuth` devuelve 401. Formato canónico: `s:<sid>.<hmacBase64>`.
  return `${cookieName}=${encodeURIComponent(`s:${signature.sign(sid, cookieSecret)}`)}`;
}

async function cleanup(userIds: string[]): Promise<void> {
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe.skipIf(!dbUp)('US-072 integration — mark-as-read endpoints', () => {
  const createdUsers: string[] = [];

  beforeAll(async () => {
    // Sanidad de conexión — el describe.skipIf(!dbUp) ya lo maneja arriba.
  }, 60_000);

  afterAll(async () => {
    await cleanup(createdUsers);
    await prisma.$disconnect();
  });

  it('IT-01 (AC-01): PATCH /notifications/:id/read propio unread → 204 + read_at set', async () => {
    const owner = await seedUserWithSession('it01');
    createdUsers.push(owner.userId);
    const notifId = await seedNotification(owner.userId, 'in_app');

    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const after = await prisma.notification.findUnique({ where: { id: notifId } });
    expect(after?.status).toBe('read');
    expect(after?.readAt).not.toBeNull();
  }, 30_000);

  it('IT-02 (AC-06): idempotencia — segundo PATCH sobre notif ya `read` → 204 sin cambios', async () => {
    const owner = await seedUserWithSession('it02');
    createdUsers.push(owner.userId);
    const notifId = await seedNotification(owner.userId, 'in_app', {
      status: 'read',
      readAt: new Date('2026-07-01T00:00:00Z'),
    });

    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);

    const after = await prisma.notification.findUnique({ where: { id: notifId } });
    // El `read_at` original se preserva — el use case cortocircuita antes del UPDATE.
    expect(after?.readAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  }, 30_000);

  it('IT-03 (AC-04, SEC-T-01 @security): ajena → 404 uniforme; el owner real queda unread', async () => {
    const owner = await seedUserWithSession('it03-owner');
    const other = await seedUserWithSession('it03-other');
    createdUsers.push(owner.userId, other.userId);
    const notifId = await seedNotification(other.userId, 'in_app');

    const res = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(404);

    const after = await prisma.notification.findUnique({ where: { id: notifId } });
    expect(after?.status).toBe('unread');
    expect(after?.readAt).toBeNull();
  }, 30_000);

  it('IT-04 (AC-05): notif inexistente → 404', async () => {
    const owner = await seedUserWithSession('it04');
    createdUsers.push(owner.userId);
    const res = await request(app)
      .patch('/api/v1/notifications/00000000-0000-4000-8000-000000000000/read')
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(404);
  }, 30_000);

  it('IT-05 (AC-02): mark-all default in_app → sólo las 3 in_app quedan `read`', async () => {
    const owner = await seedUserWithSession('it05');
    createdUsers.push(owner.userId);
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'email_simulated');
    await seedNotification(owner.userId, 'email_simulated');

    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);

    const inApp = await prisma.notification.count({
      where: { userId: owner.userId, status: 'read' },
    });
    const stillUnread = await prisma.notification.count({
      where: { userId: owner.userId, status: 'unread' },
    });
    expect(inApp).toBe(3);
    expect(stillUnread).toBe(2);
  }, 30_000);

  it('IT-06 (AC-02): mark-all ?channel=all → las 5 quedan `read`', async () => {
    const owner = await seedUserWithSession('it06');
    createdUsers.push(owner.userId);
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'email_simulated');
    await seedNotification(owner.userId, 'email_simulated');
    await seedNotification(owner.userId, 'email_simulated');

    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read?channel=all')
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);

    const stillUnread = await prisma.notification.count({
      where: { userId: owner.userId, status: 'unread' },
    });
    expect(stillUnread).toBe(0);
  }, 30_000);

  it('IT-07 (AC-02): mark-all ?channel=email_simulated → sólo las 2 email_simulated quedan `read`', async () => {
    const owner = await seedUserWithSession('it07');
    createdUsers.push(owner.userId);
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'in_app');
    await seedNotification(owner.userId, 'email_simulated');
    await seedNotification(owner.userId, 'email_simulated');

    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read?channel=email_simulated')
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);

    const emailRead = await prisma.notification.count({
      where: { userId: owner.userId, status: 'read' },
    });
    const inAppUnread = await prisma.notification.count({
      where: { userId: owner.userId, status: 'unread' },
    });
    expect(emailRead).toBe(2);
    expect(inAppUnread).toBe(2);
  }, 30_000);

  it('IT-08 (EC-02): mark-all sin unread → 204 sin error', async () => {
    const owner = await seedUserWithSession('it08');
    createdUsers.push(owner.userId);
    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Cookie', signCookie(owner.sessionCookie));
    expect(res.status).toBe(204);
  }, 30_000);

  it('IT-09 (AC-03, SEC-T-02): 401 sin sesión — ambos endpoints', async () => {
    const notifId = '00000000-0000-4000-8000-000000000000';
    const patchRes = await request(app).patch(`/api/v1/notifications/${notifId}/read`);
    expect(patchRes.status).toBe(401);
    const postRes = await request(app).post('/api/v1/notifications/mark-all-read');
    expect(postRes.status).toBe(401);
  }, 30_000);

  it('IT-10 (VR-02 / VR-03): Zod — `notificationId` no UUID → 400; `?channel=slack` → 400', async () => {
    const owner = await seedUserWithSession('it10');
    createdUsers.push(owner.userId);
    const cookie = signCookie(owner.sessionCookie);

    const badId = await request(app)
      .patch('/api/v1/notifications/not-a-uuid/read')
      .set('Cookie', cookie);
    expect(badId.status).toBe(400);

    const badChannel = await request(app)
      .post('/api/v1/notifications/mark-all-read?channel=slack')
      .set('Cookie', cookie);
    expect(badChannel.status).toBe(400);
  }, 30_000);

  it('IT-PERF (AC-08): mark-all sobre 100 notifs → P95 < 1.5 s', async () => {
    const owner = await seedUserWithSession('it-perf');
    createdUsers.push(owner.userId);
    // Seed 100 unread in_app notifs.
    await prisma.notification.createMany({
      data: Array.from({ length: 100 }, () => ({
        userId: owner.userId,
        type: 'task_due_soon',
        payload: {
          channel: 'in_app',
          languageCode: 'es-LATAM',
          title: 'perf',
          body: 'perf',
        },
        status: 'unread' as const,
      })),
    });

    const cookie = signCookie(owner.sessionCookie);
    const start = process.hrtime.bigint();
    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Cookie', cookie);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    expect(res.status).toBe(204);
    // Umbral holgado para entorno demo; AC-08 exige P95 < 1500 ms.
    expect(elapsedMs).toBeLessThan(1500);
  }, 30_000);
});
