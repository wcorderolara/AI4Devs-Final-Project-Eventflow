// Tests de integración Supertest: ownership masking + captcha (US-091 / QA-005).
// NT-04, AUTH-TS-04 (404 enmascarado), TS-03, NT-05 (captcha), SEC-003 (guard mock).
import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env.js';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import { jsonBodyParserMiddleware } from '../../src/shared/interface/middlewares/json-body-parser.middleware.js';
import { authMiddleware } from '../../src/shared/interface/middlewares/auth.middleware.js';
import { ownershipMiddleware } from '../../src/shared/interface/middlewares/ownership.middleware.js';
import { captchaVerificationMiddleware } from '../../src/shared/interface/middlewares/captcha-verification.middleware.js';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';

function buildApp(): express.Express {
  const app = express();
  app.use(correlationIdMiddleware);
  app.use(jsonBodyParserMiddleware);
  app.get('/owned-false', authMiddleware, ownershipMiddleware(async () => false), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.get('/owned-true', authMiddleware, ownershipMiddleware(async () => true), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.post('/captcha', captchaVerificationMiddleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandlerMiddleware);
  return app;
}

const app = buildApp();
const token = jwt.sign({ id: 'u1', role: 'organizer' }, config.JWT_SECRET, { expiresIn: '1h' });
const originalProvider = config.CAPTCHA_PROVIDER;

afterEach(() => {
  config.CAPTCHA_PROVIDER = originalProvider;
});

describe('ownershipMiddleware (US-091)', () => {
  it('NT-04 / AUTH-TS-04: recurso de otro usuario → 404 ENMASCARADO (no 403)', async () => {
    const res = await request(app).get('/owned-false').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('resolver true → 200', async () => {
    const res = await request(app).get('/owned-true').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('captchaVerificationMiddleware (US-091)', () => {
  it('TS-03: CAPTCHA_PROVIDER=mock + token "__test__" → pasa (200)', async () => {
    config.CAPTCHA_PROVIDER = 'mock';
    const res = await request(app).post('/captcha').send({ captchaToken: '__test__' });
    expect(res.status).toBe(200);
  });

  it('NT-05: sin captchaToken → 400 CAPTCHA_REQUIRED (US-109)', async () => {
    config.CAPTCHA_PROVIDER = 'mock';
    const res = await request(app).post('/captcha').send({});
    expect(res.status).toBe(400);
    // US-109 refina el código genérico BAD_REQUEST a CAPTCHA_REQUIRED (AC-05, VR-01).
    expect(res.body.error.code).toBe('CAPTCHA_REQUIRED');
  });

  it('SEC-003: token "__test__" con CAPTCHA_PROVIDER=recaptcha → 400 CAPTCHA_INVALID (guard activo)', async () => {
    config.CAPTCHA_PROVIDER = 'recaptcha';
    const res = await request(app).post('/captcha').send({ captchaToken: '__test__' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
  });
});
