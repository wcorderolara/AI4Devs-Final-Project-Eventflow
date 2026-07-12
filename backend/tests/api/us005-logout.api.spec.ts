// US-005 / QA-001 + QA-002 — Integration/API tests de POST /api/v1/auth/logout (PB-P1-003).
// Cubre: 204 sin body + Set-Cookie de limpieza con flags canónicos (AC-01), no-reuso de la
// cookie post-logout (AC-03 — revocación server-side, Deviation D1), 401 estricto sin sesión
// (EC-01) y 405 para métodos no permitidos (EC-03). Skip limpio sin BD.
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
const PASSWORD = 'segura12345';
const uniq = (): string => `us005api_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function authenticatedAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({
    role: 'organizer',
    name: 'Logout Tester',
    email: uniq(),
    password: PASSWORD,
    acceptedTerms: true,
    captchaToken: CAPTCHA,
  });
  if (res.status !== 201) throw new Error(`register fixture failed: ${res.status}`);
  return agent;
}

describe.skipIf(!dbUp)('US-005 QA-002 — POST /api/v1/auth/logout', () => {
  it('AC-01: 204 sin body, con Set-Cookie de limpieza (Max-Age=0/Expires pasado, HttpOnly, SameSite=Lax, Path=/)', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/v1/auth/logout');
    expect(res.status).toBe(204);
    expect(res.text ?? '').toBe('');

    const setCookie = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const clearing = setCookie.find((c) => c.startsWith(`${config.SESSION_COOKIE_NAME}=`));
    expect(clearing).toBeDefined();
    // clearCookie de Express emite Expires en el pasado (equivalente funcional a Max-Age=0).
    expect(/Max-Age=0|Expires=Thu, 01 Jan 1970/.test(clearing ?? '')).toBe(true);
    expect(clearing).toContain('HttpOnly');
    expect(clearing).toContain('SameSite=Lax');
    expect(clearing).toContain('Path=/');
  });

  it('AC-03: la cookie original NO abre sesión tras el logout (revocación server-side)', async () => {
    const agent = await authenticatedAgent();
    // Snapshot manual de la cookie de sesión vigente (simula cliente que la conserva).
    const me = await agent.get('/api/v1/users/me');
    expect(me.status).toBe(200);

    // Capturamos la cookie actual del agente para reusarla después del logout.
    const jar = agent.jar.getCookies({ domain: '127.0.0.1', path: '/', script: false, secure: false });
    const raw = jar.toValueString();

    await agent.post('/api/v1/auth/logout');

    const reuse = await request(app).get('/api/v1/users/me').set('Cookie', raw);
    expect(reuse.status).toBe(401);
  });

  it('EC-01: sin sesión → 401 AUTHENTICATION_REQUIRED (endpoint estricto)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('EC-01: cookie inválida/manipulada → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `${config.SESSION_COOKIE_NAME}=s%3Aforged.sig`);
    expect(res.status).toBe(401);
  });

  it('EC-03: GET/DELETE /auth/logout → 405 METHOD_NOT_ALLOWED sin tocar el use case', async () => {
    const get = await request(app).get('/api/v1/auth/logout');
    expect(get.status).toBe(405);
    expect(get.body.error.code).toBe('METHOD_NOT_ALLOWED');
    const del = await request(app).delete('/api/v1/auth/logout');
    expect(del.status).toBe(405);
  });

  it('idempotencia: segundo logout con la misma cookie ya revocada → 401 (no 500)', async () => {
    const agent = await authenticatedAgent();
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
    // El agente ya no tiene cookie válida (fue limpiada) → 401 estricto.
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(401);
  });
});
