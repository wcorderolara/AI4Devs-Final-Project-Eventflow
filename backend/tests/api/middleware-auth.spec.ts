// Tests de integración Supertest: authMiddleware + roleMiddleware (US-091 / QA-004).
// AC-02, NT-01, NT-02, NT-03, AUTH-TS-01..03. Distinción 401/403 (SEC-004).
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env.js';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import { jsonBodyParserMiddleware } from '../../src/shared/interface/middlewares/json-body-parser.middleware.js';
import { authMiddleware } from '../../src/shared/interface/middlewares/auth.middleware.js';
import { roleMiddleware } from '../../src/shared/interface/middlewares/role.middleware.js';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';

function buildApp(): express.Express {
  const app = express();
  app.use(correlationIdMiddleware);
  app.use(jsonBodyParserMiddleware);
  app.get('/protected', authMiddleware, (req, res) => {
    res.status(200).json({ ok: true, role: req.user?.role });
  });
  app.get('/organizer-only', authMiddleware, roleMiddleware(['organizer']), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandlerMiddleware);
  return app;
}

const app = buildApp();
const organizerToken = jwt.sign({ id: 'u1', role: 'organizer' }, config.JWT_SECRET, { expiresIn: '1h' });
const vendorToken = jwt.sign({ id: 'u2', role: 'vendor' }, config.JWT_SECRET, { expiresIn: '1h' });

describe('authMiddleware + roleMiddleware (US-091)', () => {
  it('TS-02: JWT válido → req.user poblado, handler alcanzado (200)', async () => {
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, role: 'organizer' });
  });

  it('NT-01: sin Authorization → 401 UNAUTHORIZED + correlationId', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
    expect(typeof res.body.correlationId).toBe('string');
  });

  it('NT-02: JWT expirado → 401', async () => {
    const expired = jwt.sign({ id: 'u1', role: 'organizer' }, config.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('NT-02: JWT firmado con secret incorrecto → 401', async () => {
    const forged = jwt.sign({ id: 'u1', role: 'organizer' }, 'wrong-secret-that-is-not-real-000', { expiresIn: '1h' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('AUTH-TS-01: token válido + rol correcto → 200', async () => {
    const res = await request(app).get('/organizer-only').set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
  });

  it('NT-03 / AUTH-TS-02: token válido + rol incorrecto → 403 FORBIDDEN (no 401)', async () => {
    const res = await request(app).get('/organizer-only').set('Authorization', `Bearer ${vendorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-03: sin token en ruta con rol → 401 (authMiddleware primero)', async () => {
    const res = await request(app).get('/organizer-only');
    expect(res.status).toBe(401);
  });
});
