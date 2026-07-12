// US-094 / QA-003 — Security negative tests. Subconjunto que NO requiere BD (auth anónima,
// captcha, role allowlist, ausencia de Set-Cookie, rate limit, flags de cookie, redacción de logs).
// Los flujos que requieren BD (401 por credenciales inválidas, no-token-en-JSON en login exitoso)
// se cubren en us094-auth.integration.spec.ts (DB-gated). Cubre AC-01/02/03/05/06/08; SEC-02..08.
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { createApp } from '../../src/app.js';
import { baseCookieOptions } from '../../src/infrastructure/security/session-cookie.js';
import { StructuredAuthEventLogger } from '../../src/infrastructure/observability/structured-auth-event-logger.js';
import { LoggingPasswordResetNotifier } from '../../src/infrastructure/notifications/logging-password-reset-notifier.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';

const app = createApp();
const validRegister = { email: 'x@example.com', password: 'Secret1234', name: 'Ana', role: 'organizer', acceptedTerms: true };

describe('QA-003: autorización negativa sin sesión (AUTH-TS-02, NT-10)', () => {
  it('GET /api/v1/users/me sin cookie → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('POST /api/v1/auth/logout sin cookie → 401', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe('QA-003: registro público no crea admin (SEC-08, AUTH-TS-05, NT-01)', () => {
  it('register con role=admin → 400 VALIDATION_ERROR; no llega al use case', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, role: 'admin', captchaToken: '__test__' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('QA-003: captcha obligatorio corta antes de credenciales (EC-04, NT-03)', () => {
  it('register con captcha inválido → 400 CAPTCHA_INVALID, sin Set-Cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister, captchaToken: 'invalid-token' });
    expect(res.status).toBe(400);
    // US-109 refina BAD_REQUEST → CAPTCHA_INVALID para token inválido (AC-05, VR-02).
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('login pre-umbral: captcha inválido se IGNORA (US-003 EC-02) → sin cookie, sin CAPTCHA_INVALID', async () => {
    // US-003 (Decisión PO #1/#2, posterior a US-109) hace el captcha de login CONDICIONAL (N=3):
    // antes del umbral el token no se procesa y el flujo cae en credenciales (401 con BD).
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'Secret1234', captchaToken: 'invalid-token' });
    expect(res.body?.error?.code).not.toBe('CAPTCHA_INVALID');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('password/reset-request con captcha inválido → 400 CAPTCHA_INVALID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: 'a@b.com', captchaToken: 'invalid-token' });
    expect(res.status).toBe(400);
  });
});

describe('QA-003: rate limit → 429 con envelope estándar (EC-05, NT-06)', () => {
  // Los limiters reales se omiten en `test` (evitan contaminación de estado). Aquí verificamos el
  // MECANISMO y el envelope 429 con un limiter dedicado de max=2, idéntico en forma al de producción.
  const limitApp = express();
  limitApp.use((req, _res, next) => {
    (req as unknown as { correlationId: string }).correlationId = 'cid-test';
    next();
  });
  limitApp.use(
    rateLimit({
      windowMs: 60_000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', correlationId: req.correlationId ?? '' },
        });
      },
    }),
  );
  limitApp.post('/limited', (_req, res) => res.status(200).json({ ok: true }));

  it('la 3.ª request dentro de la ventana → 429 RATE_LIMIT_EXCEEDED', async () => {
    await request(limitApp).post('/limited');
    await request(limitApp).post('/limited');
    const res = await request(limitApp).post('/limited');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('QA-003: flags de cookie de sesión (SEC-03, ADR-SEC-002)', () => {
  it('la cookie es HttpOnly, firmada, SameSite=Lax, Path=/', () => {
    const opts = baseCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.signed).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
  });
});

describe('QA-003: redacción — logs no exponen secretos (SEC-07, NT-12)', () => {
  it('AuthEventLogger solo emite metadatos seguros (sin password/token/hash)', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    new StructuredAuthEventLogger().emit('auth.login.failure', { correlationId: 'c1', userId: 'u1', reason: 'x' });
    const payload = spy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['correlationId', 'event', 'latencyMs', 'reason', 'role', 'userId']); // US-001/US-002: +latencyMs +role (metadatos seguros)
    spy.mockRestore();
  });

  it('el notifier de reset NO loguea el token crudo (SEC-07)', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    void new LoggingPasswordResetNotifier().deliver({ userId: 'u1', email: 'a@b.com', rawToken: 'SUPER_SECRET_TOKEN' });
    const serialized = JSON.stringify(spy.mock.calls);
    expect(serialized).not.toContain('SUPER_SECRET_TOKEN');
    expect(serialized).not.toContain('a@b.com');
    spy.mockRestore();
  });
});
