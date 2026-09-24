// US-008 (PB-P4-001 / API-001, QA-001) — Integration/API de los endpoints OAuth Google.
// Con `GOOGLE_OAUTH_ENABLED` apagado + NODE_ENV=test, la factory monta el `MockOAuthProvider`
// (flujo autocontenido: la URL de autorización redirige directo al callback con un `code`
// sintético). Los casos de control de flujo (state inválido, cancelación, continuación ausente,
// validación de rol) NO tocan la BD y corren siempre; los happy-path login/signup/link requieren
// Postgres y se saltan limpio si no hay BD (skipIf).
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { encodeMockOAuthCode } from '../../src/infrastructure/oauth/mock-oauth-provider.js';

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

/** Normaliza el header Set-Cookie (string | string[] | undefined) a un array. */
function asCookieArray(setCookie: string | string[] | undefined): string[] {
  if (!setCookie) return [];
  return Array.isArray(setCookie) ? setCookie : [setCookie];
}

/** Extrae la cookie de state (`eventflow_oauth_state=...`) de un header Set-Cookie. */
function stateCookieFrom(setCookie: string | string[] | undefined): string | undefined {
  return asCookieArray(setCookie).find((c) => c.startsWith('eventflow_oauth_state='))?.split(';')[0];
}

describe('US-008 API-001 — OAuth Google (control de flujo, sin BD)', () => {
  it('AUTH-TS-01: GET /api/v1/auth/google (anónimo) → 302 + cookie de state', async () => {
    const res = await request(app).get('/api/v1/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBeTruthy();
    expect(stateCookieFrom(res.headers['set-cookie'])).toBeTruthy();
  });

  it('EC-02: callback con `error` (cancelación) → 302 a /login?oauth=cancelled', async () => {
    const res = await request(app).get('/api/v1/auth/google/callback?error=access_denied');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?oauth=cancelled');
  });

  it('NT-02: callback sin cookie de state → 400 OAUTH_STATE_INVALID (mensaje neutro)', async () => {
    const code = encodeMockOAuthCode({ identity: { sub: 's', email: 'a@b.com', emailVerified: true }, nonce: 'n' });
    const res = await request(app).get(`/api/v1/auth/google/callback?code=${code}&state=whatever`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OAUTH_STATE_INVALID');
    expect(res.body.error.message).toBe('No fue posible iniciar sesión');
  });

  it('NT-02: callback con state que no coincide con la cookie → 400', async () => {
    const start = await request(app).get('/api/v1/auth/google');
    const cookie = stateCookieFrom(start.headers['set-cookie'])!;
    const res = await request(app)
      .get('/api/v1/auth/google/callback?code=x&state=TAMPERED')
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OAUTH_STATE_INVALID');
  });

  it('NT-01: id_token expirado (state válido) → 400 OAUTH_VERIFICATION_FAILED neutro', async () => {
    const start = await request(app).get('/api/v1/auth/google');
    const cookie = stateCookieFrom(start.headers['set-cookie'])!;
    const state = new URL(String(start.headers.location)).searchParams.get('state')!;
    // Código sintético con escenario de fallo `expired` (el mock rechaza antes de tocar la BD).
    const code = encodeMockOAuthCode({
      identity: { sub: 's', email: 'a@b.com', emailVerified: true },
      nonce: 'ignored',
      fail: 'expired',
    });
    const res = await request(app)
      .get(`/api/v1/auth/google/callback?code=${code}&state=${state}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OAUTH_VERIFICATION_FAILED');
    expect(res.body.error.message).toBe('No fue posible iniciar sesión');
  });

  it('NT-03/EC-01: email_verified=false (state válido) → 400 OAUTH_VERIFICATION_FAILED', async () => {
    const start = await request(app).get('/api/v1/auth/google');
    const cookie = stateCookieFrom(start.headers['set-cookie'])!;
    const state = new URL(String(start.headers.location)).searchParams.get('state')!;
    const code = encodeMockOAuthCode({
      identity: { sub: 's', email: 'a@b.com', emailVerified: false },
      nonce: 'ignored',
      fail: 'email_not_verified',
    });
    const res = await request(app)
      .get(`/api/v1/auth/google/callback?code=${code}&state=${state}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OAUTH_VERIFICATION_FAILED');
  });

  it('continuación ausente: POST complete-signup sin cookie → 410 OAUTH_CONTINUATION_INVALID', async () => {
    const res = await request(app).post('/api/v1/auth/google/complete-signup').send({ role: 'organizer' });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('OAUTH_CONTINUATION_INVALID');
  });

  it('VR-03/NT-04: POST complete-signup con role=admin → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/google/complete-signup').send({ role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AC-03: POST confirm-link con confirm=false → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/google/confirm-link').send({ confirm: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('continuación ausente: POST confirm-link sin cookie → 410', async () => {
    const res = await request(app).post('/api/v1/auth/google/confirm-link').send({ confirm: true });
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('OAUTH_CONTINUATION_INVALID');
  });
});

// ── Happy-path con BD (login / signup / link) ────────────────────────────────
const GSUB = 'mock-google-sub-demo'; // MOCK_DEFAULT_IDENTITY.sub
const GEMAIL = 'demo.google@seed.eventflow.test';

/** Completa el round-trip start → callback siguiendo el redirect del mock. */
async function startAndCallback(): Promise<{ res: request.Response; cookies: string[] }> {
  const start = await request(app).get('/api/v1/auth/google');
  const stateCookie = stateCookieFrom(start.headers['set-cookie']) ?? '';
  const location = new URL(String(start.headers.location));
  const path = location.pathname + location.search; // /api/v1/auth/google/callback?code=..&state=..
  const res = await request(app).get(path).set('Cookie', stateCookie);
  return { res, cookies: asCookieArray(res.headers['set-cookie']) };
}

describe.skipIf(!dbUp)('US-008 API-001 — happy path con BD', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany({ where: { user: { email: GEMAIL } } });
    await prisma.user.deleteMany({ where: { email: GEMAIL } });
  });

  it('TS-02 signup: primer OAuth → 302 a select-role; complete-signup crea cuenta + sesión', async () => {
    const { res } = await startAndCallback();
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/google/select-role');
    const continuation = asCookieArray(res.headers['set-cookie']).find((c) =>
      c.startsWith('eventflow_oauth_continuation='),
    );
    expect(continuation).toBeTruthy();

    const complete = await request(app)
      .post('/api/v1/auth/google/complete-signup')
      .set('Cookie', continuation!.split(';')[0] ?? '')
      .send({ role: 'organizer' });
    expect(complete.status).toBe(201);
    expect(complete.body.data.email).toBe(GEMAIL);
    // SEC-05: el id_token nunca aparece en la respuesta.
    expect(JSON.stringify(complete.body)).not.toContain('id_token');
    const row = await prisma.user.findUnique({ where: { email: GEMAIL } });
    expect(row?.googleSub).toBe(GSUB);
    expect(row?.passwordHash).toBeNull();
  });

  it('TS-01 login: usuario ya vinculado → 302 directo al dashboard por rol + cookie de sesión', async () => {
    await prisma.user.create({
      data: { email: GEMAIL, googleSub: GSUB, fullName: 'Demo', role: 'vendor', status: 'active' },
    });
    const { res } = await startAndCallback();
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/vendor');
    const session = asCookieArray(res.headers['set-cookie']).find((c) =>
      c.startsWith('eventflow_session='),
    );
    expect(session).toBeTruthy();
  });

  it('TS-03 link: email existente sin google_sub → 302 a confirm-link; confirm vincula', async () => {
    await prisma.user.create({
      data: { email: GEMAIL, passwordHash: '$argon2id$dummy', fullName: 'Demo', role: 'organizer', status: 'active' },
    });
    const { res } = await startAndCallback();
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/google/confirm-link');
    const continuation = asCookieArray(res.headers['set-cookie']).find((c) =>
      c.startsWith('eventflow_oauth_continuation='),
    );
    const confirm = await request(app)
      .post('/api/v1/auth/google/confirm-link')
      .set('Cookie', continuation!.split(';')[0] ?? '')
      .send({ confirm: true });
    expect(confirm.status).toBe(200);
    const row = await prisma.user.findUnique({ where: { email: GEMAIL } });
    expect(row?.googleSub).toBe(GSUB);
  });
});
