// US-109 / QA-004 (no-DB) + QA-003 (DB) — Enforcement de captcha en auth. AC-01/02/03/05; VR-01/02.
// No-DB: token ausente → CAPTCHA_REQUIRED; token inválido → CAPTCHA_INVALID; route mapping (reset
// confirm, logout, /users/me NO exigen captcha). DB-gated: register/login/reset-request con
// '__test__' continúan al caso de uso.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

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
const CAPTCHA = '__test__';
const uniq = (): string => `us109_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;
const register = { password: 'Secret1234', name: 'Cap', role: 'organizer' };

describe('US-109 QA-004: token ausente → CAPTCHA_REQUIRED (EC-01, NT-01, sin DB)', () => {
  it('register sin captchaToken → 400 CAPTCHA_REQUIRED', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...register, email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_REQUIRED');
  });
  it('login sin captchaToken → 400 CAPTCHA_REQUIRED', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.com', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_REQUIRED');
  });
  it('password/reset-request sin captchaToken → 400 CAPTCHA_REQUIRED', async () => {
    const res = await request(app).post('/api/v1/auth/password/reset-request').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_REQUIRED');
  });
});

describe('US-109 QA-004: token inválido → CAPTCHA_INVALID (EC-02, NT-02, sin DB)', () => {
  it('register con token distinto de __test__ → 400 CAPTCHA_INVALID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...register, email: 'a@b.com', captchaToken: 'not-the-mock' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
  });
  it('login con token inválido → 400 CAPTCHA_INVALID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'x', captchaToken: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
  });
});

describe('US-109 QA-004: route mapping — endpoints sin captcha (BE-007, SEC-003, sin DB)', () => {
  it('POST /password/reset (confirm) NO exige captcha (no CAPTCHA_* code)', async () => {
    const res = await request(app).post('/api/v1/auth/password/reset').send({});
    expect(res.body.error.code).not.toBe('CAPTCHA_REQUIRED');
    expect(res.body.error.code).not.toBe('CAPTCHA_INVALID');
  });
  it('POST /logout sin cookie → 401 (no captcha)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
  it('GET /users/me → 401 (no captcha)', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-109 QA-003: happy path con mock captcha (DB)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE password_reset_tokens, sessions, users RESTART IDENTITY CASCADE`,
    );
  });

  it('AC-01: register con __test__ continúa al use case → 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...register, email: uniq(), captchaToken: CAPTCHA });
    expect(res.status).toBe(201);
  });

  it('AC-02: login con __test__ continúa al use case → 200 + cookie', async () => {
    const email = uniq();
    await request(app).post('/api/v1/auth/register').send({ ...register, email, captchaToken: CAPTCHA });
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('AC-03: reset-request con __test__ → 202 anti-enumeración', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: uniq(), captchaToken: CAPTCHA });
    expect(res.status).toBe(202);
  });
});
