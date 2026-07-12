// US-108 / QA-002 + QA-003 — Integration/API de cookie de sesión. Cubre AC-01/03/04/05.
// DB-gated (QA-002): login emite Set-Cookie con Max-Age 30 días, HttpOnly, Path=/, SameSite=Lax y
// sin token en JSON; logout limpia la cookie; request posterior → 401. No-DB (QA-003): cookie
// manipulada/ausente en ruta protegida → 401 AUTHENTICATION_REQUIRED sin filtrar la causa.
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
const uniq = (): string => `us108_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

/** 30 días en segundos, tal como Express serializa `maxAge` (ms) a `Max-Age` en el header. */
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

describe.skipIf(!dbUp)('US-108 QA-002 — Set-Cookie de sesión (DB)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE password_reset_tokens, sessions, users RESTART IDENTITY CASCADE`,
    );
  });

  it('AC-01: login emite cookie HttpOnly, Path=/, SameSite=Lax, Max-Age 30 días y sin token en JSON', async () => {
    const email = uniq();
    await request(app)
      .post('/api/v1/auth/register')
      .send({ acceptedTerms: true, email, password: 'Secret1234', name: 'Cookie', role: 'organizer', captchaToken: CAPTCHA });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });

    expect(res.status).toBe(200);
    const setCookie = (res.headers['set-cookie'] as unknown as string[]).join(';').toLowerCase();
    expect(setCookie).toContain('eventflow_session=');
    expect(setCookie).toContain('httponly');
    expect(setCookie).toContain('path=/');
    expect(setCookie).toContain('samesite=lax');
    expect(setCookie).toContain(`max-age=${THIRTY_DAYS_SECONDS}`);
    // Ningún token/sid/jti en el cuerpo (SEC-03).
    expect(JSON.stringify(res.body)).not.toMatch(/token|"sid"|jti/i);
  });

  it('AC-05: logout limpia la cookie (Max-Age=0/expira) y /users/me posterior → 401', async () => {
    const email = uniq();
    const agent = request.agent(app);
    await agent
      .post('/api/v1/auth/register')
      .send({ acceptedTerms: true, email, password: 'Secret1234', name: 'Out', role: 'organizer', captchaToken: CAPTCHA });
    await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });

    const logout = await agent.post('/api/v1/auth/logout');
    expect(logout.status).toBe(204);
    const cleared = (logout.headers['set-cookie'] as unknown as string[]).join(';').toLowerCase();
    expect(cleared).toContain('eventflow_session=');
    expect(cleared.includes('max-age=0') || cleared.includes('expires=thu, 01 jan 1970')).toBe(true);

    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe('US-108 QA-003 — cookie inválida/ausente en ruta protegida (sin DB)', () => {
  it('AC-04: sin cookie → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('EC-01/AC-04: cookie manipulada (firma inválida) → 401 sin detalle interno', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Cookie', 'eventflow_session=s%3Aforged-value.invalidsignature');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    // No revela si fue firma inválida, expiración o ausencia (respuesta uniforme).
    expect(JSON.stringify(res.body)).not.toMatch(/signature|expired|revoked|firma/i);
  });
});
