// US-094 / QA-002 — Integration/API tests (Supertest + Prisma test DB). Cubre AC-01..AC-08 y los
// negativos clave (409 EMAIL_TAKEN, 401 credenciales, logout→401, reuso de token). Sigue el patrón
// del repo: skip limpio si no hay BD alcanzable (`describe.skipIf(!dbUp)`). Captcha en modo mock
// acepta '__test__'. El token de reset se captura espiando el notifier (no viaja en la respuesta).
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
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
const uniq = (): string => `us094_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

describe.skipIf(!dbUp)('US-094 QA-002 — AUTH/profile integration', () => {
  beforeAll(async () => {
    // BD de test dedicada: limpia usuarios/sesiones/tokens de esta suite (CASCADE respeta FKs).
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE password_reset_tokens, sessions, users RESTART IDENTITY CASCADE`,
    );
  });

  it('AC-01: register organizer → 201 con AuthUserResponse (sin passwordHash) y meta.correlationId', async () => {
    const email = uniq();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Secret1234', name: 'Org', role: 'organizer', captchaToken: CAPTCHA });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: email.toLowerCase(), role: 'organizer', status: 'active', name: 'Org' });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(typeof res.body.meta.correlationId).toBe('string');
  });

  it('AC-01: register vendor → 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniq(), password: 'Secret1234', name: 'Ven', role: 'vendor', captchaToken: CAPTCHA });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('vendor');
  });

  it('EC-02/NT-02: email duplicado → 409 EMAIL_TAKEN', async () => {
    const email = uniq();
    const body = { email, password: 'Secret1234', name: 'Dup', role: 'organizer', captchaToken: CAPTCHA };
    await request(app).post('/api/v1/auth/register').send(body);
    const res = await request(app).post('/api/v1/auth/register').send(body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('AC-02: login → 200, Set-Cookie HttpOnly y sin token en el JSON', async () => {
    const email = uniq();
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Secret1234', name: 'L', role: 'organizer', captchaToken: CAPTCHA });
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie.join(';').toLowerCase()).toContain('httponly');
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
  });

  it('EC-03/NT-04: login credenciales inválidas → 401 genérico, sin Set-Cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@eventflow.test', password: 'Secret1234', captchaToken: CAPTCHA });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('AC-03/AC-05: /users/me con sesión → 200; logout → 204; luego /users/me → 401', async () => {
    const email = uniq();
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'Me', role: 'organizer', captchaToken: CAPTCHA });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });

    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email.toLowerCase());

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);

    const after = await agent.get('/api/v1/users/me');
    expect(after.status).toBe(401);
  });

  it('AC-04/NT-11: PATCH /users/me actualiza name/phone/preferredLanguage; email/role intactos', async () => {
    const email = uniq();
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'P', role: 'organizer', captchaToken: CAPTCHA });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });

    const res = await agent.patch('/api/v1/users/me').send({ name: 'Nuevo Nombre', phone: '+502 5555', preferredLanguage: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Nuevo Nombre', phone: '+502 5555', preferredLanguage: 'en', email: email.toLowerCase(), role: 'organizer' });

    // Campo inmutable rechazado por schema estricto.
    const bad = await agent.patch('/api/v1/users/me').send({ role: 'admin' });
    expect(bad.status).toBe(400);
  });

  it('AC-04: PATCH /users/me/preferred-language actualiza idioma', async () => {
    const email = uniq();
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'Lang', role: 'vendor', captchaToken: CAPTCHA });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
    const res = await agent.patch('/api/v1/users/me/preferred-language').send({ preferredLanguage: 'pt' });
    expect(res.status).toBe(200);
    expect(res.body.data.preferredLanguage).toBe('pt');
  });

  it('change-password: 204 y la nueva contraseña permite login', async () => {
    const email = uniq();
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'CP', role: 'organizer', captchaToken: CAPTCHA });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
    const res = await agent.post('/api/v1/users/me/change-password').send({ currentPassword: 'Secret1234', newPassword: 'NewSecret99' });
    expect(res.status).toBe(204);
    const relogin = await request(app).post('/api/v1/auth/login').send({ email, password: 'NewSecret99', captchaToken: CAPTCHA });
    expect(relogin.status).toBe(200);
  });

  it('AC-06/AC-07: reset-request → 202 genérico; reset con token → 204; reuso → rechazado', async () => {
    const email = uniq();
    await request(app).post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'R', role: 'organizer', captchaToken: CAPTCHA });

    const deliverSpy = vi.spyOn(LoggingPasswordResetNotifier.prototype, 'deliver');
    const reqRes = await request(app).post('/api/v1/auth/password/reset-request').send({ email, captchaToken: CAPTCHA });
    expect(reqRes.status).toBe(202);
    const rawToken = deliverSpy.mock.calls.at(-1)?.[0]?.rawToken as string;
    expect(rawToken).toBeTruthy();

    const reset = await request(app).post('/api/v1/auth/password/reset').send({ token: rawToken, newPassword: 'Reset12345' });
    expect(reset.status).toBe(204);

    const reuse = await request(app).post('/api/v1/auth/password/reset').send({ token: rawToken, newPassword: 'Another123' });
    expect(reuse.status).toBe(401);

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Reset12345', captchaToken: CAPTCHA });
    expect(login.status).toBe(200);
    deliverSpy.mockRestore();
  });

  it('AC-06/NT-07: reset-request para email inexistente → 202 genérico', async () => {
    const res = await request(app).post('/api/v1/auth/password/reset-request').send({ email: 'ghost@eventflow.test', captchaToken: CAPTCHA });
    expect(res.status).toBe(202);
  });
});
