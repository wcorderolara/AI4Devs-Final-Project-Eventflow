// US-111 / QA-002..006 — Regresión del orden de la cadena de middlewares (AC-01,03,04,05,06,08).
// Verifica sobre la app real: correlation, Helmet, CORS allowlist, notFound/errorHandler finales,
// short-circuit de auth antes de validación, y error 500 seguro con correlationId sin stack.
import { describe, it, expect, vi } from 'vitest';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import { notFoundMiddleware } from '../../src/shared/interface/middlewares/not-found.middleware.js';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import { roleMiddleware } from '../../src/shared/interface/middlewares/role.middleware.js';

const app = createApp();

describe('US-111 QA-002: cadena global determinística (AC-01, AC-04)', () => {
  it('correlationId: genera header de respuesta y ECHOa el entrante', async () => {
    const gen = await request(app).get('/health');
    expect(gen.status).toBe(200);
    expect(gen.headers['x-correlation-id']).toBeDefined();

    const echoed = await request(app).get('/health').set('x-correlation-id', 'my-cid-123');
    expect(echoed.headers['x-correlation-id']).toBe('my-cid-123');
  });

  it('Helmet aplica security headers globalmente (AC-04, SEC-TS-01)', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // Helmet oculta la firma del framework.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('US-111 QA-005: CORS allowlist y notFound/errorHandler finales (AC-04, AC-05, AC-06)', () => {
  it('CORS rechaza un Origin fuera de la allowlist (SEC-TS-02)', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(403);
  });

  it('notFound: ruta inexistente → 404 estructurado con correlationId (AC-06)', async () => {
    const res = await request(app).get('/api/v1/does-not-exist-xyz').set('x-correlation-id', 'nf-cid');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.correlationId).toBe('nf-cid');
  });
});

describe('US-111 QA-003: short-circuit protegido — auth antes de validación (AC-02, AC-07)', () => {
  it('PATCH /users/me anónimo con body inválido → 401, NO 400 (auth precede validation)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ email: 123, unknownField: true }); // body inválido y sin cookie
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('roleMiddleware corta con 403 antes del handler cuando el rol no coincide (NT-02)', async () => {
    const spy = vi.fn();
    const tiny: Express = express();
    tiny.use(correlationIdMiddleware);
    tiny.use((req, _res, next) => {
      (req as unknown as { user: unknown }).user = { id: 'u1', role: 'organizer' };
      next();
    });
    const handler: RequestHandler = (_req, res) => {
      spy();
      res.json({ ok: true });
    };
    tiny.get('/admin-only', roleMiddleware(['admin']), handler);
    tiny.use(errorHandlerMiddleware);

    const res = await request(tiny).get('/admin-only');
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('US-111 QA-004: public sensitive — anti-abuse/validation antes del handler (AC-03)', () => {
  it('POST /auth/register sin captcha → 400 CAPTCHA_REQUIRED (handler no corre, sin DB)', async () => {
    // US-003 hizo el captcha de login CONDICIONAL (N=3); el enforcement incondicional
    // pre-handler se verifica sobre /auth/register (misma cadena anti-abuse).
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ role: 'organizer', name: 'Ana Pérez', email: 'a@b.com', password: 'Secret1234', acceptedTerms: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_REQUIRED');
  });

  it('POST /auth/login con body malformado → 400 VALIDATION_ERROR antes del handler (sin DB)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'no-es-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('US-111 QA-005/QA-006: errorHandler último, envelope seguro + correlationId (AC-05, AC-08)', () => {
  it('error inesperado → 500 seguro sin stack ni detalle interno, con correlationId', async () => {
    const tiny: Express = express();
    tiny.use(correlationIdMiddleware);
    tiny.get('/boom', () => {
      throw new Error('super-secret-internal-detail');
    });
    tiny.use(notFoundMiddleware);
    tiny.use(errorHandlerMiddleware);

    const res = await request(tiny).get('/boom').set('x-correlation-id', 'boom-cid');
    expect(res.status).toBe(500);
    expect(res.body.error.correlationId).toBe('boom-cid');
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('super-secret-internal-detail');
    expect(serialized).not.toContain('stack');
    expect(res.body.error.message).not.toMatch(/super-secret/);
  });
});
