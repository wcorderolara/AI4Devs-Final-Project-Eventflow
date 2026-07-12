// US-002 / QA-002+QA-003+SEC-001 — Integration/API tests del registro vendor (Supertest +
// Postgres test). Cubre: 201 happy path (cookie + role=vendor), preferred_language por
// Accept-Language (AC-03), 409 EMAIL_TAKEN cross-role con mensaje neutro idéntico entre flujos
// (EC-01/SEC-001), 400 captcha inválido (D1), 400 password débil, whitelist de rol (D2) y
// regression organizer. Skip limpio sin BD.
import { describe, it, expect } from 'vitest';
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
const uniq = (): string => `us002api_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

function vendorPayload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    role: 'vendor',
    businessName: 'Catering Luna SA',
    email: uniq(),
    password: 'segura12345',
    acceptedTerms: true,
    captchaToken: CAPTCHA,
    ...over,
  };
}

describe.skipIf(!dbUp)('US-002 QA-003 — POST /api/v1/auth/register (role=vendor)', () => {
  it('AC-01: 201 con role=vendor, cookie de sesión y name = businessName', async () => {
    const email = uniq();
    const res = await request(app).post('/api/v1/auth/register').send(vendorPayload({ email }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ role: 'vendor', status: 'active', name: 'Catering Luna SA' });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;
    const sessionCookie = setCookie?.find((c) => c.startsWith(`${config.SESSION_COOKIE_NAME}=`));
    expect(sessionCookie).toContain('HttpOnly');
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.role).toBe('vendor');
    expect(row?.fullName).toBe('Catering Luna SA');
  });

  it('AC-03: Accept-Language pt → preferred_language=pt persistido', async () => {
    const email = uniq();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Accept-Language', 'pt-BR,pt;q=0.9')
      .send(vendorPayload({ email }));
    expect(res.status).toBe(201);
    expect(res.body.data.preferredLanguage).toBe('pt');
    const row = await prisma.user.findUnique({ where: { email } });
    expect(row?.preferredLanguage).toBe('pt');
  });

  it('EC-01/SEC-001: email de organizer existente → 409 EMAIL_TAKEN con payload idéntico cross-flow', async () => {
    const email = uniq();
    // 1) organizer se registra primero (US-001).
    const org = await request(app).post('/api/v1/auth/register').send({
      role: 'organizer',
      name: 'Ana Organizadora',
      email,
      password: 'segura12345',
      acceptedTerms: true,
      captchaToken: CAPTCHA,
    });
    expect(org.status).toBe(201);

    // 2) vendor con el mismo email (case-insensitive) → 409 neutro.
    const asVendor = await request(app)
      .post('/api/v1/auth/register')
      .send(vendorPayload({ email: email.toUpperCase() }));
    expect(asVendor.status).toBe(409);
    expect(asVendor.body.error.code).toBe('EMAIL_TAKEN');
    // El mensaje no revela el rol del usuario existente.
    expect(asVendor.body.error.message.toLowerCase()).not.toContain('organizer');
    expect(asVendor.body.error.message.toLowerCase()).not.toContain('vendor');

    // 3) equivalencia neutra: el mismo conflicto desde el flujo organizer produce code+message idénticos.
    const asOrganizer = await request(app).post('/api/v1/auth/register').send({
      role: 'organizer',
      name: 'Otra Persona',
      email,
      password: 'segura12345',
      acceptedTerms: true,
      captchaToken: CAPTCHA,
    });
    expect(asOrganizer.status).toBe(409);
    expect(asOrganizer.body.error.code).toBe(asVendor.body.error.code);
    expect(asOrganizer.body.error.message).toBe(asVendor.body.error.message);
  });

  it('EC-02: captcha inválido → 400 CAPTCHA_INVALID sin persistencia (D1)', async () => {
    const email = uniq();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(vendorPayload({ email, captchaToken: 'token-invalido' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CAPTCHA_INVALID');
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('EC-03: password débil → 400 VALIDATION_ERROR con details', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(vendorPayload({ password: 'corta1' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('NT-04/D2: role=admin → 400 VALIDATION_ERROR; payload vendor con name → 400 (.strict())', async () => {
    const email = uniq();
    const admin = await request(app).post('/api/v1/auth/register').send(vendorPayload({ email, role: 'admin' }));
    expect(admin.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

    const conName = await request(app)
      .post('/api/v1/auth/register')
      .send(vendorPayload({ name: 'Colado' }));
    expect(conName.status).toBe(400);
    expect(conName.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('regression US-001: flujo organizer sigue verde tras el refactor (BE-001 DoD)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      role: 'organizer',
      name: 'Regressión Organizer',
      email: uniq(),
      password: 'segura12345',
      acceptedTerms: true,
      captchaToken: CAPTCHA,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('organizer');
  });
});
