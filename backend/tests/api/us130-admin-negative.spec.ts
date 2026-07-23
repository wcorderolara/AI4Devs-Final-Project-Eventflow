// US-130 / PB-P2-018 — SEC-003. Casos negativos admin: panel restringido a no-admin + escalamiento
// de privilegios (rol X → operación de rol Y). AC-01/AC-02; BR-AUTH-008, BR-AUTH-010, VR-04.
//
// Extiende (no duplica) us094-security-negative (registro público no crea admin) y us112
// (registry solo tenía `GET /admin/events/:id`). Foco: TODOS los routers `/admin/*` reales
// montados en `app.ts` — 401 anónimo + 403 no-admin (organizer/vendor) por endpoint.
//
// Escalamiento cruzado: además de vendor→events (US-112) y organizer→vendors/me (US-112) que ya
// son parte del baseline, aquí se prueba que un admin NO puede ejecutar operaciones organizer-
// only (BR-AUTH-010 · `admin` no invade escritura de dominio del organizer).
import { describe, it, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { expectAuthError, expectNoLeak } from '../helpers/negative-auth.js';
import { organizerAgent, vendorAgent, adminAgent, seedCommonCatalog, activeEvent } from '../helpers/us130-multi-role.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const UUID = '11111111-1111-4111-8111-111111111111';

/** Inventario de endpoints `/admin/*` reales montados en `app.ts` (US-016/047/067/075/076/079/080/115).
 * Cada entrada define el status esperado ante un anónimo (401) y un rol no-admin (403). */
const ADMIN_ENDPOINTS = [
  { method: 'get', path: `/api/v1/admin/events/${UUID}`, module: 'admin-events' },
  { method: 'get', path: '/api/v1/admin/metrics', module: 'admin-metrics' },
  { method: 'get', path: '/api/v1/admin/ai-metrics', module: 'admin-ai-metrics' },
  { method: 'get', path: '/api/v1/admin/admin-actions', module: 'admin-actions' },
  { method: 'get', path: '/api/v1/admin/users', module: 'admin-users' },
  { method: 'get', path: '/api/v1/admin/service-categories', module: 'admin-service-categories' },
  { method: 'get', path: '/api/v1/admin/event-types', module: 'admin-event-types' },
  { method: 'post', path: `/api/v1/admin/reviews/${UUID}/moderate`, body: { action: 'hide', reason: 'x' }, module: 'admin-reviews' },
  { method: 'post', path: `/api/v1/admin/vendors/${UUID}/moderate`, body: { action: 'approve', reason: 'x' }, module: 'admin-vendors' },
] as const;

function hit(method: string, path: string, body?: Record<string, unknown>): request.Test {
  switch (method) {
    case 'get': return request(app).get(path);
    case 'post': return request(app).post(path).send(body ?? {});
    case 'patch': return request(app).patch(path).send(body ?? {});
    case 'delete': return request(app).delete(path);
    default: throw new Error(`method ${method}`);
  }
}

describe('US-130 SEC-003 (sin BD): panel admin — anónimo → 401 en TODOS los routers /admin/*', () => {
  it.each(ADMIN_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    '%s sin sesión → 401 AUTHENTICATION_REQUIRED',
    async (_label, e) => {
      const res = await hit(e.method, e.path, 'body' in e ? e.body : undefined);
      expectAuthError(res, 401);
      expectNoLeak(res);
    },
  );
});

describe.skipIf(!dbUp)('US-130 SEC-003 (con BD): panel admin — organizer / vendor → 403 FORBIDDEN en TODOS los /admin/*', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles, ai_recommendations, booking_intents, quotes, quote_requests, events RESTART IDENTITY CASCADE`,
    );
  });

  it.each(ADMIN_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    'organizer → %s → 403 FORBIDDEN',
    async (_label, e) => {
      const org = await organizerAgent(app);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = (org.agent as any)[e.method](e.path);
      const res = e.method === 'get' ? await call : await call.send('body' in e ? e.body : {});
      expectAuthError(res, 403);
      expectNoLeak(res);
    },
  );

  it.each(ADMIN_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    'vendor → %s → 403 FORBIDDEN',
    async (_label, e) => {
      const vendor = await vendorAgent(app);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = (vendor.agent as any)[e.method](e.path);
      const res = e.method === 'get' ? await call : await call.send('body' in e ? e.body : {});
      expectAuthError(res, 403);
      expectNoLeak(res);
    },
  );
});

describe.skipIf(!dbUp)('US-130 SEC-003 (con BD): escalamiento de privilegios — admin NO invade dominio organizer / vendor', () => {
  let locationId = '';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles, ai_recommendations, booking_intents, quotes, quote_requests, events RESTART IDENTITY CASCADE`,
    );
    const seeded = await seedCommonCatalog(prisma);
    locationId = seeded.locationId;
  });

  it('NT-06 (BR-AUTH-010): admin → POST /events (organizer-only) → 403', async () => {
    const admin = await adminAgent(app, prisma);
    const res = await admin.agent.post('/api/v1/events').send({
      eventTypeCode: 'wedding', eventDate: '2026-12-31', guestsCount: 50, locationId,
      estimatedBudget: '1000.00', currencyCode: 'GTQ', languageCode: 'es-LATAM',
    });
    expectAuthError(res, 403);
    expectNoLeak(res);
  });

  it('NT-06 (BR-AUTH-010): admin → POST /events/:id/ai/event-plan (organizer ownership) → 403 (rol antes de ownership)', async () => {
    const admin = await adminAgent(app, prisma);
    const res = await admin.agent.post(`/api/v1/events/${UUID}/ai/event-plan`).send({ input: { x: 1 } });
    expectAuthError(res, 403);
    expectNoLeak(res);
  });

  it('NT-06 (BR-AUTH-010): admin → POST /vendors/me/ai/bio (vendor-only) → 403', async () => {
    const admin = await adminAgent(app, prisma);
    const res = await admin.agent.post('/api/v1/vendors/me/ai/bio').send({ input: { x: 1 } });
    expectAuthError(res, 403);
    expectNoLeak(res);
  });

  it('NT-06 (BR-AUTH-005 mono-rol): organizer → GET /admin/events/:id → 403 (rol admin requerido)', async () => {
    const org = await organizerAgent(app);
    const eventId = await activeEvent(org.agent, locationId);
    // El propio organizer NO puede leer su evento por la ruta admin — mono-rol (BR-AUTH-005).
    const res = await org.agent.get(`/api/v1/admin/events/${eventId}`);
    expectAuthError(res, 403);
    expectNoLeak(res);
  });
});
