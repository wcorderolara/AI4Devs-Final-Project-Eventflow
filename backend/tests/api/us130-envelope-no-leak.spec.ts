// US-130 / PB-P2-018 — QA-002. Aserción de envelope de error estándar sin fuga de datos en
// 401/403/404 (AC-03; SEC-03; NT-08; VR-02).
//
// Verifica sobre una muestra representativa de 401/403/404 producidos por la app real:
//   • Envelope canónico `{ error: { code, message, correlationId } }` (docs/16 §652/§653).
//   • Sin campos extra top-level (no filtra `data`, `stack`, `path`, `sql`, `resource`).
//   • `expectNoLeak` extendido: además de stack/SQL/secretos, verifica ausencia de identifiers
//     internos como el UUID del recurso protegido (evita filtrar existencia por reflejar el id
//     de un recurso ajeno de vuelta al cliente que no debería conocerlo).
//   • El `code` pertenece al catálogo (`AUTHENTICATION_REQUIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`).
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { expectAuthError, expectNoLeak, AUTH_ERROR_CODES } from '../helpers/negative-auth.js';
import { organizerAgent, seedCommonCatalog, activeEvent } from '../helpers/us130-multi-role.js';

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

/** Aserta la forma canónica: solo `{error: {code, message, correlationId, details?}}` — sin campos extra. */
function expectCanonicalEnvelope(body: unknown, expectedCode: string): void {
  expect(body).toEqual(
    expect.objectContaining({
      error: expect.objectContaining({
        code: expectedCode,
        message: expect.any(String),
        correlationId: expect.any(String),
      }),
    }),
  );
  const topKeys = Object.keys(body as Record<string, unknown>);
  expect(topKeys).toEqual(['error']);
  const errorKeys = Object.keys((body as { error: Record<string, unknown> }).error).sort();
  for (const k of errorKeys) {
    expect(['code', 'message', 'correlationId', 'details']).toContain(k);
  }
}

describe('US-130 QA-002 (sin BD): envelope canónico + no-leak en 401 anónimo', () => {
  const cases = [
    { method: 'get', path: '/api/v1/users/me' },
    { method: 'post', path: '/api/v1/booking-intents', body: { quote_id: UUID, disclaimer_accepted: true } },
    { method: 'get', path: `/api/v1/quote-requests/${UUID}` },
    { method: 'get', path: '/api/v1/admin/metrics' },
    { method: 'get', path: '/api/v1/admin/users' },
    { method: 'get', path: '/api/v1/admin/admin-actions' },
  ] as const;
  it.each(cases.map((c) => [`${c.method.toUpperCase()} ${c.path}`, c] as const))(
    '%s anónimo → 401 con envelope canónico y sin campos extra',
    async (_label, c) => {
      const req = c.method === 'get' ? request(app).get(c.path) : request(app).post(c.path).send('body' in c ? c.body : {});
      const cid = '55555555-5555-4555-8555-555555555555';
      const res = await req.set('x-correlation-id', cid);
      expectAuthError(res, 401, { correlationId: cid });
      expectNoLeak(res);
      expectCanonicalEnvelope(res.body, AUTH_ERROR_CODES[401]);
    },
  );
});

describe.skipIf(!dbUp)('US-130 QA-002 (con BD): envelope canónico + no-leak en 403 wrong-role y 404 masked', () => {
  let locationId = '';

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ai_recommendations, booking_intents, quotes, quote_requests, events, sessions, password_reset_tokens, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );
    const seeded = await seedCommonCatalog(prisma);
    locationId = seeded.locationId;
  });

  it('403 wrong-role → envelope canónico + FORBIDDEN + sin leaks', async () => {
    // organizer → panel admin → 403 FORBIDDEN (rol admin requerido, mono-rol).
    const org = await organizerAgent(app);
    const cid = '66666666-6666-4666-8666-666666666666';
    const res = await org.agent.get('/api/v1/admin/metrics').set('x-correlation-id', cid);
    expectAuthError(res, 403, { correlationId: cid });
    expectNoLeak(res);
    expectCanonicalEnvelope(res.body, AUTH_ERROR_CODES[403]);
  });

  it('404 masked cross-owner → envelope canónico + RESOURCE_NOT_FOUND + sin fuga del id ajeno', async () => {
    // Ambos organizadores; A crea evento; B lo lee → 404. Verifica que el cuerpo NO refleje
    // `eventId`, `ownerId`, `name` ni ningún atributo del recurso ajeno.
    const orgA = await organizerAgent(app);
    const orgB = await organizerAgent(app);
    const eventId = await activeEvent(orgA.agent, locationId);
    const cid = '77777777-7777-4777-8777-777777777777';
    const res = await orgB.agent.get(`/api/v1/events/${eventId}`).set('x-correlation-id', cid);
    expectAuthError(res, 404, { correlationId: cid });
    expectNoLeak(res);
    expectCanonicalEnvelope(res.body, AUTH_ERROR_CODES[404]);
    // Fuga específica: el body NO debe incluir el UUID del recurso ajeno (dato del recurso protegido).
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(eventId);
  });
});
