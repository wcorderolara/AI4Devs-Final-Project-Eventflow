// US-004 / QA-002 + QA-005 — Integration/API tests del flujo de recuperación (PB-P1-004).
// Cubre: 202 neutro idéntico (existente vs inexistente, repetido — QA-005), flujo completo
// 202→token→204→login con nueva contraseña, catálogo EC-01..03 (400 TOKEN_INVALID/TOKEN_USED,
// 410 GONE_TOKEN_EXPIRED con token realmente expirado en BD), 400 VALIDATION_ERROR (política) y
// 429 del bucket confirm (5/IP/10min). Skip limpio sin BD.
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { LoggingPasswordResetNotifier } from '../../src/infrastructure/notifications/logging-password-reset-notifier.js';

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
const uniq = (): string => `us004api_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function registerUser(email: string): Promise<void> {
  const res = await request(app).post('/api/v1/auth/register').send({
    role: 'organizer',
    name: 'Reset Tester',
    email,
    password: PASSWORD,
    acceptedTerms: true,
    captchaToken: CAPTCHA,
  });
  if (res.status !== 201) throw new Error(`register fixture failed: ${res.status}`);
}

async function requestToken(email: string): Promise<string> {
  const spy = vi.spyOn(LoggingPasswordResetNotifier.prototype, 'deliver');
  const res = await request(app)
    .post('/api/v1/auth/password/reset-request')
    .send({ email, captchaToken: CAPTCHA });
  expect(res.status).toBe(202);
  const raw = spy.mock.calls.at(-1)?.[0]?.rawToken as string;
  spy.mockRestore();
  return raw;
}

describe.skipIf(!dbUp)('US-004 QA-002/QA-005 — reset-request 202 neutro', () => {
  it('AC-01/AC-03/QA-005: 202 con cuerpo idéntico para email existente, inexistente y repetido', async () => {
    const email = uniq();
    await registerUser(email);

    const existing = await request(app)
      .post('/api/v1/auth/password/reset-request')
      .send({ email, captchaToken: CAPTCHA });
    const ghost = await request(app)
      .post('/api/v1/auth/password/reset-request')
      .send({ email: uniq(), captchaToken: CAPTCHA });
    const repeated = await request(app)
      .post('/api/v1/auth/password/reset-request')
      .send({ email, captchaToken: CAPTCHA });

    expect(existing.status).toBe(202);
    expect(ghost.status).toBe(202);
    expect(repeated.status).toBe(202);
    expect(ghost.body.data.message).toBe(existing.body.data.message);
    expect(repeated.body.data.message).toBe(existing.body.data.message);
  });

  it('AC-01: token persistido con TTL 30 min y solo como hash (nunca el token plano)', async () => {
    const email = uniq();
    await registerUser(email);
    const before = Date.now();
    const raw = await requestToken(email);
    expect(raw.length).toBeGreaterThanOrEqual(32); // ≥32 bytes → hex/base64 largo

    const row = await prisma.passwordResetToken.findFirst({
      where: { user: { email } },
      orderBy: { createdAt: 'desc' },
    });
    expect(row).not.toBeNull();
    expect(row?.tokenHash).not.toBe(raw); // solo hash persistido (SEC-02)
    const ttlMs = (row?.expiresAt.getTime() ?? 0) - before;
    expect(ttlMs).toBeGreaterThan(29 * 60 * 1000);
    expect(ttlMs).toBeLessThan(31 * 60 * 1000);
  });
});

describe.skipIf(!dbUp)('US-004 QA-002 — reset con token (catálogo EC-01..03)', () => {
  it('AC-02: token vigente → 204, contraseña argon2id nueva permite login', async () => {
    const email = uniq();
    await registerUser(email);
    const raw = await requestToken(email);

    const reset = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: raw, newPassword: 'NuevaClave99' });
    expect(reset.status).toBe(204);

    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'NuevaClave99' });
    expect(login.status).toBe(200);
  });

  it('EC-02: reuso del token → 400 TOKEN_USED', async () => {
    const email = uniq();
    await registerUser(email);
    const raw = await requestToken(email);
    await request(app).post('/api/v1/auth/password/reset').send({ token: raw, newPassword: 'NuevaClave99' });
    const reuse = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: raw, newPassword: 'OtraClave88' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('TOKEN_USED');
  });

  it('EC-03: token alterado → 400 TOKEN_INVALID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'token-alterado-que-no-existe', newPassword: 'NuevaClave99' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('EC-01: token expirado (expires_at en el pasado) → 410 GONE_TOKEN_EXPIRED', async () => {
    const email = uniq();
    await registerUser(email);
    const raw = await requestToken(email);
    // Expira el token directamente en BD (ventana vencida).
    await prisma.passwordResetToken.updateMany({
      where: { user: { email } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: raw, newPassword: 'NuevaClave99' });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('GONE_TOKEN_EXPIRED');
  });

  it('AC-05: política de contraseña no cumple → 400 VALIDATION_ERROR con field newPassword (D1)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ token: 'cualquiera', newPassword: 'corta1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const details = res.body.error.details as Array<{ field: string }>;
    expect(details.some((d) => d.field.includes('newPassword'))).toBe(true);
  });
});

describe.skipIf(!dbUp)('US-004 AC-04 — rate limit del confirm (5/IP/10min)', () => {
  const originalEnabled = config.RATE_LIMIT_ENABLED;
  const originalMax = config.AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX;
  beforeAll(() => {
    config.RATE_LIMIT_ENABLED = true;
    config.AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX = 2;
  });
  afterAll(() => {
    config.RATE_LIMIT_ENABLED = originalEnabled;
    config.AUTH_PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX = originalMax;
  });

  it('excede el máximo por IP → 429 RATE_LIMIT_EXCEEDED con Retry-After', async () => {
    const agent = request.agent(app);
    const body = { token: 'x'.repeat(43), newPassword: 'NuevaClave99' };
    await agent.post('/api/v1/auth/password/reset').send(body);
    await agent.post('/api/v1/auth/password/reset').send(body);
    const blocked = await agent.post('/api/v1/auth/password/reset').send(body);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
