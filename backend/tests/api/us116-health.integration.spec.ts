// US-116 (PB-P2-013 / QA-002 · QA-003) — Integration/API tests con `createApp()`.
//
// Cubre (Tech Spec §13):
//   IT-01 (AC-01) — GET /health sin sesión → 200 + DTO plano válido.
//   IT-02 (AC-02) — GET /health/ready con DB OK + openai + key → 200 status=ok.       [skipIf(!dbUp)]
//   IT-03 (AC-02 · EC-03) — GET /health/ready con DB OK + mock → 200 ai=mock.         [skipIf(!dbUp)]
//   IT-04 (AC-02 · EC-02) — GET /health/ready con DB OK + openai sin key → degraded.  [skipIf(!dbUp)]
//   IT-05 (AC-03 · EC-01) — GET /health/ready sin DB alcanzable → 503 postgres=down.  [ejecutable sin dbUp]
//   IT-06 (EC-07 · VR-03) — POST /health → 405.
//   IT-07 (AC-05 · SEC-04) — 20 requests rápidos NO devuelven 429.
//   IT-08 (AC-06 · VR-04) — response NO incluye header X-Correlation-Id.
//   IT-10 (AC-04) — anonymous, guard no aplica.
//   SEC-T-01 (SEC-02 · VR-01) — body no expone DATABASE_URL/PASSWORD/TOKEN/SECRET/PRIVATE_KEY.
//   SEC-T-02 (VR-02) — response 503 no expone stack ni mensaje raw de Prisma.
//   PERF (§13.5 · AC-09) — /health P95 single-shot < 100ms sanity.
//
// Nota: IT-09 (spy sobre logger success bypass) queda cubierto por UT — el UT del middleware es
// más determinístico que un spy dentro de Supertest.
import { afterAll, describe, expect, it } from 'vitest';
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

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('US-116 QA — IT sin dependencia de BD alcanzable', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('IT-01 (AC-01): GET /health sin sesión → 200 con DTO plano válido', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
    expect(Number.isInteger(res.body.uptimeMs)).toBe(true);
    expect(res.body.timestamp).toMatch(ISO_RE);
    expect(Object.keys(res.body).sort()).toEqual(['status', 'timestamp', 'uptimeMs', 'version']);
  });

  it('IT-06 (EC-07 · VR-03): POST /health → 405 sin body', async () => {
    const res = await request(app).post('/health');
    expect(res.status).toBe(405);
    expect(res.text).toBe('');
  });

  it('IT-06b (EC-07): PUT /health/ready → 405', async () => {
    const res = await request(app).put('/health/ready');
    expect(res.status).toBe(405);
  });

  it('IT-07 (AC-05 · SEC-04): 20 requests rápidos a /health no devuelven 429', async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      // El middleware `rateLimitMiddleware` skip debe evitar RateLimit-*.
      expect(res.headers['ratelimit-remaining']).toBeUndefined();
    }
  });

  it('IT-08 (AC-06 · VR-04): response NO incluye header X-Correlation-Id', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeUndefined();
    // Body plano: sin meta.correlationId (excepción explícita al envelope canonical).
    expect(res.body.meta).toBeUndefined();
    expect(res.body.correlationId).toBeUndefined();
  });

  it('IT-08b: response de /health/ready tampoco propaga X-Correlation-Id', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.headers['x-correlation-id']).toBeUndefined();
  });

  it('IT-08c: header X-Correlation-Id entrante NO se echoa (bypass)', async () => {
    const validUuid = '12345678-1234-4123-8123-1234567890ab';
    const res = await request(app).get('/health').set('X-Correlation-Id', validUuid);
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeUndefined();
  });

  it('IT-10 (AC-04): endpoint anónimo — sin sesión, sin CSRF, sin guard', async () => {
    // Sin cookies, sin auth headers.
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('SEC-T-01 (SEC-02 · VR-01): body de /health NO contiene secretos/env vars', async () => {
    const res = await request(app).get('/health');
    const body = JSON.stringify(res.body);
    for (const forbidden of [
      'DATABASE_URL',
      'PASSWORD',
      'TOKEN',
      'SECRET',
      'PRIVATE_KEY',
      'OPENAI_API_KEY',
      'SESSION_SECRET',
    ]) {
      expect(body.toUpperCase()).not.toContain(forbidden);
    }
  });

  it('SEC-T-01b: body de /health/ready NO contiene secretos', async () => {
    const res = await request(app).get('/health/ready');
    const body = JSON.stringify(res.body);
    for (const forbidden of [
      'DATABASE_URL',
      'PASSWORD',
      'TOKEN',
      'SECRET',
      'PRIVATE_KEY',
      'OPENAI_API_KEY',
      'SESSION_SECRET',
      'connection',
      'stack',
      'trace',
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  it('SEC-T-02 (VR-02): 503 NO expone stack ni mensaje raw de Prisma', async () => {
    // Si BD está up ⇒ 200; si no ⇒ 503. En ambos casos verificamos no-leak.
    const res = await request(app).get('/health/ready');
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/at .+\(.*:\d+:\d+\)/); // stack trace pattern
    expect(body).not.toContain('PrismaClient');
    expect(body).not.toContain('PrismaClientInitializationError');
    expect(body).not.toContain('P1001'); // Prisma error code para "can't reach db"
    // Shape estable: sólo las 5 keys del DTO ReadyResponseDto.
    expect(Object.keys(res.body).sort()).toEqual([
      'dependencies', 'status', 'timestamp', 'uptimeMs', 'version',
    ]);
    expect(Object.keys(res.body.dependencies).sort()).toEqual(['aiProvider', 'postgres']);
  });

  it('PERF (§13.5 · AC-09): GET /health single-shot < 100ms (sanity)', async () => {
    const start = Date.now();
    const res = await request(app).get('/health');
    const ms = Date.now() - start;
    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(100);
  });
});

describe.skipIf(!dbUp)('US-116 QA — IT con BD real', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('IT-02 (AC-02): GET /health/ready DB OK + openai+key → 200 status=ok', async () => {
    const prev = { p: process.env.LLM_PROVIDER, k: process.env.OPENAI_API_KEY };
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test-abc';
    try {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.dependencies.postgres).toBe('ok');
      expect(res.body.dependencies.aiProvider).toBe('ok');
    } finally {
      process.env.LLM_PROVIDER = prev.p;
      process.env.OPENAI_API_KEY = prev.k;
    }
  });

  it('IT-03 (AC-02 · EC-03): DB OK + mock → 200 status=ok, ai=mock', async () => {
    const prev = { p: process.env.LLM_PROVIDER };
    process.env.LLM_PROVIDER = 'mock';
    try {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.dependencies.aiProvider).toBe('mock');
    } finally {
      process.env.LLM_PROVIDER = prev.p;
    }
  });

  it('IT-04 (AC-02 · EC-02): DB OK + openai sin key → 200 status=degraded, ai=down', async () => {
    const prev = { p: process.env.LLM_PROVIDER, k: process.env.OPENAI_API_KEY };
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = '';
    try {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.dependencies.postgres).toBe('ok');
      expect(res.body.dependencies.aiProvider).toBe('down');
    } finally {
      process.env.LLM_PROVIDER = prev.p;
      process.env.OPENAI_API_KEY = prev.k;
    }
  });
});

describe.skipIf(dbUp)('US-116 QA — IT-05 sin BD alcanzable (postgres=down)', () => {
  it('IT-05 (AC-03 · EC-01): DB down → 503 status=error, postgres=down', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.dependencies.postgres).toBe('down');
    // Version + uptimeMs + timestamp igual presentes.
    expect(typeof res.body.version).toBe('string');
    expect(Number.isInteger(res.body.uptimeMs)).toBe(true);
    expect(res.body.timestamp).toMatch(ISO_RE);
  });
});
