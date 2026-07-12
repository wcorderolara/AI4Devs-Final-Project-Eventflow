// US-001 / QA-003 — API tests (Supertest) de POST /api/v1/auth/register (PB-P1-001).
// Escenarios: 201 happy path (cookie HttpOnly/SameSite=Lax + Accept-Language), 400 captcha
// inválido (contrato CAPTCHA_INVALID — Deviation D1 del execution record), 400 password débil,
// 409 EMAIL_TAKEN, 409 ALREADY_AUTHENTICATED (SEC-01), intento role=admin (VR-06/SEC-02, D2)
// y 429 RATE_LIMIT_EXCEEDED del bucket `register` (SEC-04). Skip limpio sin BD.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';

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
const uniq = (): string => `us001api_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

function payload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    email: uniq(),
    password: 'segura12345',
    name: 'Organizadora Uno',
    role: 'organizer',
    acceptedTerms: true,
    captchaToken: CAPTCHA,
    ...over,
  };
}

describe.skipIf(!dbUp)('US-001 QA-003 — POST /api/v1/auth/register', () => {
  it('AC-01: 201 con cookie de sesión HttpOnly/SameSite=Lax, envelope y sin password_hash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Accept-Language', 'es-419,es;q=0.9')
      .send(payload());

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ role: 'organizer', status: 'active' });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('password_hash');
    expect(typeof res.body.meta.correlationId).toBe('string');
    expect(res.headers['x-correlation-id']).toBeDefined();

    // SEC-06: cookie firmada HTTP-only con flags por ambiente (Secure off en test/local).
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const sessionCookie = setCookie?.find((c) => c.startsWith(`${config.SESSION_COOKIE_NAME}=`));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');
    expect(sessionCookie).toContain('Path=/');
  });

  it('AC-02: sin preferredLanguage en el body, infiere de Accept-Language (pt-BR → pt)', async () => {
    const email = uniq();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Accept-Language', 'pt-BR,pt;q=0.9,en;q=0.5')
      .send(payload({ email }));
    expect(res.status).toBe(201);
    expect(res.body.data.preferredLanguage).toBe('pt');
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.preferredLanguage).toBe('pt');
  });

  it('EC-01: captcha inválido → 400 CAPTCHA_INVALID sin crear el User (D1)', async () => {
    const email = uniq();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(payload({ email, captchaToken: 'token-invalido' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('EC-02: password débil → 400 VALIDATION_ERROR con details[] por campo', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(payload({ password: 'corta1' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const details = res.body.error.details as Array<{ field: string }>;
    expect(details.some((d) => d.field.includes('password'))).toBe(true);
  });

  it('AC-03: email duplicado (case-insensitive) → 409 EMAIL_TAKEN con mensaje neutro', async () => {
    const email = uniq();
    await request(app).post('/api/v1/auth/register').send(payload({ email }));
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(payload({ email: email.toUpperCase() }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    // El mensaje no revela datos del usuario existente.
    expect(res.body.error.message).not.toContain(email.split('@')[0]);
  });

  it('SEC-01: usuario ya autenticado → 409 ALREADY_AUTHENTICATED', async () => {
    const agent = request.agent(app);
    const first = await agent.post('/api/v1/auth/register').send(payload());
    expect(first.status).toBe(201);
    const res = await agent.post('/api/v1/auth/register').send(payload());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_AUTHENTICATED');
  });

  it('NT-04/SEC-02: intento role=admin → 400 VALIDATION_ERROR y jamás se persiste (D2)', async () => {
    const email = uniq();
    const res = await request(app).post('/api/v1/auth/register').send(payload({ email, role: 'admin' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});

describe.skipIf(!dbUp)('US-001 QA-003/SEC-001 — 429 RATE_LIMIT_EXCEEDED bucket register (5/IP/10min)', () => {
  const originalEnabled = config.RATE_LIMIT_ENABLED;
  const originalMax = config.AUTH_REGISTER_RATE_LIMIT_MAX;
  beforeAll(() => {
    config.RATE_LIMIT_ENABLED = true;
    config.AUTH_REGISTER_RATE_LIMIT_MAX = 2;
  });
  afterAll(() => {
    config.RATE_LIMIT_ENABLED = originalEnabled;
    config.AUTH_REGISTER_RATE_LIMIT_MAX = originalMax;
  });

  it('excede el máximo por IP → 429 con Retry-After y sin crear el User excedente', async () => {
    const agent = request.agent(app);
    expect((await agent.post('/api/v1/auth/register').send(payload())).status).toBe(201);
    // Segunda petición con sesión activa → 409, pero cuenta para el bucket por IP.
    expect((await agent.post('/api/v1/auth/register').send(payload())).status).toBe(409);

    const email = uniq();
    const blocked = await agent.post('/api/v1/auth/register').send(payload({ email }));
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});
