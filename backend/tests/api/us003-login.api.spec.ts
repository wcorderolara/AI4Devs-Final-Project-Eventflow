// US-003 / QA-002 + QA-003 — Integration/API tests de POST /api/v1/auth/login (PB-P1-003).
// Cadena real de middlewares (rate limit → guard solo-anónimo → Zod → captcha condicional →
// handler): 200 con cookie 30d, 400 VALIDATION_ERROR, 401 genérico idéntico (email inexistente
// vs password incorrecto), 409 ALREADY_AUTHENTICATED, captcha condicional N=3
// (CAPTCHA_REQUIRED/CAPTCHA_INVALID/éxito con token), 429 con Retry-After y GET /users/me
// post-login. Skip limpio sin BD.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { authAttemptTracker } from '../../src/infrastructure/auth-composition.js';

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
const PASSWORD = 'segura12345';
const uniq = (): string => `us003api_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function registerUser(email: string): Promise<void> {
  const res = await request(app).post('/api/v1/auth/register').send({
    role: 'organizer',
    name: 'Login Tester',
    email,
    password: PASSWORD,
    acceptedTerms: true,
    captchaToken: CAPTCHA,
  });
  if (res.status !== 201) throw new Error(`register fixture failed: ${res.status}`);
}

describe.skipIf(!dbUp)('US-003 QA-003 — POST /api/v1/auth/login', () => {
  it('AC-01/AC-03: 200 con cookie HttpOnly/SameSite=Lax/Path=/ y Max-Age=30d; sin token en JSON', async () => {
    const email = uniq();
    await registerUser(email);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email, role: 'organizer' });
    expect(res.body.data).not.toHaveProperty('passwordHash');

    const setCookie = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const cookie = setCookie.find((c) => c.startsWith(`${config.SESSION_COOKIE_NAME}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    // Max-Age=30 días (Decisión PO US-003 #5): 2592000 segundos.
    expect(cookie).toContain(`Max-Age=${30 * 24 * 60 * 60}`);
    expect(JSON.stringify(res.body)).not.toContain(cookie?.split(';')[0]?.split('=')[1] ?? '@@none@@');
  });

  it('AC-02: GET /api/v1/users/me post-login devuelve la identidad para el ruteo por rol', async () => {
    const email = uniq();
    await registerUser(email);
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/logout'); // limpia por si acaso (idempotente sin sesión → 401)
    const login = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(200);
    expect(me.body.data).toMatchObject({ email, role: 'organizer' });
  });

  it('EC-01/VR-04: 401 genérico IDÉNTICO para email inexistente y password incorrecto', async () => {
    const email = uniq();
    await registerUser(email);

    const wrongPass = await request(app).post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
    const ghost = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniq(), password: PASSWORD });

    expect(wrongPass.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(wrongPass.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(ghost.body.error.code).toBe(wrongPass.body.error.code);
    expect(ghost.body.error.message).toBe(wrongPass.body.error.message);
  });

  it('VR-01/VR-02: body malformado → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'no-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AC-04: sesión activa → 409 ALREADY_AUTHENTICATED sin nueva cookie', async () => {
    const email = uniq();
    await registerUser(email);
    const agent = request.agent(app);
    const first = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
    expect(first.status).toBe(200);
    const second = await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_AUTHENTICATED');
    expect(second.headers['set-cookie']).toBeUndefined();
  });

  it('EC-02: tras 3 fallos exige captcha (CAPTCHA_REQUIRED → CAPTCHA_INVALID → éxito con token y reset)', async () => {
    const email = uniq();
    await registerUser(email);

    // 3 fallos consecutivos (pre-umbral: sin captcha, 401 genérico).
    for (let i = 0; i < 3; i++) {
      const fail = await request(app).post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
      expect(fail.status).toBe(401);
    }

    // 4.º intento sin token → CAPTCHA_REQUIRED (aunque la credencial fuera correcta).
    const required = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD });
    expect(required.status).toBe(400);
    expect(required.body.error.code).toBe('CAPTCHA_REQUIRED');

    // Con token inválido → CAPTCHA_INVALID.
    const invalid = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, captchaToken: 'nope' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('CAPTCHA_INVALID');

    // Con token válido y credenciales correctas → 200 y contador reseteado.
    const ok = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, captchaToken: CAPTCHA });
    expect(ok.status).toBe(200);

    const postReset = await request(app).post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
    expect(postReset.status).toBe(401); // vuelve al flujo pre-umbral (sin CAPTCHA_REQUIRED)
  });
});

describe.skipIf(!dbUp)('US-003 SEC-001/AC-05 — 429 RATE_LIMIT_EXCEEDED bucket login (10/IP/10min)', () => {
  const originalEnabled = config.RATE_LIMIT_ENABLED;
  const originalMax = config.AUTH_LOGIN_RATE_LIMIT_MAX;
  beforeAll(() => {
    config.RATE_LIMIT_ENABLED = true;
    config.AUTH_LOGIN_RATE_LIMIT_MAX = 2;
  });
  afterAll(() => {
    config.RATE_LIMIT_ENABLED = originalEnabled;
    config.AUTH_LOGIN_RATE_LIMIT_MAX = originalMax;
  });

  it('excede el máximo → 429 con Retry-After, sin procesar credenciales ni captcha', async () => {
    const agent = request.agent(app);
    const email = uniq();
    await agent.post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
    const blocked = await agent.post('/api/v1/auth/login').send({ email, password: 'Wrong12345' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});

// Limpieza defensiva del tracker global compartido entre suites del mismo proceso.
afterAll(() => {
  authAttemptTracker.pruneExpired();
});
