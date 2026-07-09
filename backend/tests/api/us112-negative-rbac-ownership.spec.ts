// US-112 / PB-P0-008 — Suite negativa RBAC + ownership (foundation). AC-01..AC-08.
// Núcleo DB-free (corre en CI como quality gate): sweep anónimo → 401 dirigido por registry,
// endpoints públicos NO marcados, validation-before-authz, envelope seguro + correlationId + no-leak.
// Bloque DB-gated (skipIf): wrong-role → 403 antes de validation (sin crear recursos).
// La cobertura DB-gated de cross-owner/assignment por recurso ya vive en us095/096/097-security.spec.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { PROTECTED_ENDPOINTS, PUBLIC_ENDPOINTS } from '../helpers/protected-endpoints.js';
import { expectAuthError, expectNoLeak, agentFor } from '../helpers/negative-auth.js';

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

/** Helper: construye un request anónimo por método+path (con body vacío para métodos mutativos). */
function anon(method: string, path: string): request.Test {
  switch (method) {
    case 'get':
      return request(app).get(path);
    case 'post':
      return request(app).post(path).send({});
    case 'patch':
      return request(app).patch(path).send({});
    case 'put':
      return request(app).put(path).send({});
    case 'delete':
      return request(app).delete(path);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

describe('US-112 TS-01: integridad del registry de endpoints protegidos', () => {
  it('el registry no está vacío y no solapa con endpoints públicos', () => {
    expect(PROTECTED_ENDPOINTS.length).toBeGreaterThan(20);
    const publicKeys = new Set(PUBLIC_ENDPOINTS.map((e) => `${e.method} ${e.path}`));
    for (const e of PROTECTED_ENDPOINTS) {
      expect(publicKeys.has(`${e.method} ${e.path}`)).toBe(false);
      expect(e.path.startsWith('/api/v1/')).toBe(true);
    }
  });
});

describe('US-112 QA-001 / AC-01: anonymous → 401 en TODOS los endpoints protegidos (sin BD)', () => {
  it.each(PROTECTED_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    '%s sin sesión → 401 AUTHENTICATION_REQUIRED',
    async (_label, e) => {
      const res = await anon(e.method, e.path).set('x-correlation-id', 'anon-cid');
      expectAuthError(res, 401, { correlationId: 'anon-cid' });
      expectNoLeak(res);
    },
  );
});

describe('US-112 EC-04: endpoints públicos NO se marcan como protegidos', () => {
  it.each(PUBLIC_ENDPOINTS.map((e) => [`${e.method.toUpperCase()} ${e.path}`, e] as const))(
    '%s no responde 401 a un anónimo',
    async (_label, e) => {
      const res = await anon(e.method, e.path);
      expect(res.status).not.toBe(401);
    },
  );
});

describe('US-112 QA-005 / AC-06: validation NO corre antes de auth en rutas protegidas (sin BD)', () => {
  it('PATCH /users/me anónimo con body inválido → 401, NO 400/422', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ email: 123, junk: true });
    expectAuthError(res, 401);
  });
  it('POST /events anónimo con body inválido → 401, NO 400/422', async () => {
    const res = await request(app).post('/api/v1/events').send({ nope: {} });
    expectAuthError(res, 401);
  });
  it('POST /events/:id/ai/event-plan anónimo con body inválido → 401 (no LLMProvider)', async () => {
    const res = await request(app)
      .post('/api/v1/events/00000000-0000-4000-8000-000000000000/ai/event-plan')
      .send({ invalid: true });
    expectAuthError(res, 401);
  });
});

describe('US-112 AC-05: no existen endpoints admin foundation montados', () => {
  it('GET /api/v1/admin/* → 404 (ruta no registrada; sin admin scope foundation aún)', async () => {
    const res = await request(app).get('/api/v1/admin/anything');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});

describe('US-112 AC-07: error envelope seguro y consistente (sin BD)', () => {
  it('401 incluye code, message y correlationId (echo), sin leaks', async () => {
    const res = await request(app).get('/api/v1/users/me').set('x-correlation-id', 'env-cid');
    expectAuthError(res, 401, { correlationId: 'env-cid' });
    expect(typeof res.body.error.message).toBe('string');
    expectNoLeak(res);
  });
});

// ── DB-gated: wrong-role → 403 antes de validation (requiere sesiones reales) ──
describe.skipIf(!dbUp)('US-112 QA-002 / AC-02: wrong-role → 403 (DB)', () => {
  let organizer: Awaited<ReturnType<typeof agentFor>>;
  let vendor: Awaited<ReturnType<typeof agentFor>>;
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE password_reset_tokens, sessions, users RESTART IDENTITY CASCADE`);
    organizer = await agentFor(app, 'organizer');
    vendor = await agentFor(app, 'vendor');
  });

  it('vendor → POST /events (organizer-only) → 403', async () => {
    const res = await vendor.post('/api/v1/events').send({ nope: true });
    expectAuthError(res, 403);
  });
  it('vendor → GET /events (organizer-only) → 403', async () => {
    expectAuthError(await vendor.get('/api/v1/events'), 403);
  });
  it('organizer → GET /vendors/me/quote-requests (vendor-only) → 403', async () => {
    expectAuthError(await organizer.get('/api/v1/vendors/me/quote-requests'), 403);
  });
  it('organizer → POST /vendors/me/ai/bio (vendor-only) → 403', async () => {
    expectAuthError(await organizer.post('/api/v1/vendors/me/ai/bio').send({}), 403);
  });
  it('AC-06 (DB): vendor → POST /events con body inválido → 403, NO 400 (role antes de validation)', async () => {
    const res = await vendor.post('/api/v1/events').send({ title: 123, invalid: {} });
    expectAuthError(res, 403);
  });
});
