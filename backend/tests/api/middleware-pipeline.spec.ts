// Tests de integración Supertest: pipeline global (US-091 / QA-006 + OBS-001).
// NT-07 (rate limit 429 + Retry-After), NT-08 (body limit), NT-09 (CORS), TS-06 (orden),
// AC-01/AC-07 propagación de correlationId.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('Pipeline global — CORS, body limit, correlationId (US-091)', () => {
  it('OBS-001 / AC-01: GET /health devuelve cabecera x-correlation-id', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBeDefined();
  });

  it('AC-01: reutiliza el x-correlation-id entrante', async () => {
    const res = await request(app).get('/health').set('x-correlation-id', 'test-id-123');
    expect(res.headers['x-correlation-id']).toBe('test-id-123');
  });

  it('NT-09: Origin fuera de la allowlist → 403', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('NT-09: Origin en la allowlist → 200', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
    expect(res.status).toBe(200);
  });

  it('NT-08: body JSON que supera JSON_BODY_LIMIT → 413 PAYLOAD_TOO_LARGE con correlationId', async () => {
    // US-025 (PB-P1-016 / EC-06): body > 256KB retorna 413 `PAYLOAD_TOO_LARGE` (mapping
    // canónico); reemplaza el mapping histórico de US-091 (400 `BAD_REQUEST`).
    const huge = JSON.stringify({ data: 'x'.repeat(1_100_000) });
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send(huge);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.error.correlationId).toBeDefined();
  });

  it('TS-06: app.ts registra los middlewares globales en el orden de Doc 14 §8.2', () => {
    const source = readFileSync(resolve(here, '../../src/app.ts'), 'utf8');
    const registrations = [
      'app.use(correlationIdMiddleware',
      'app.use(requestLoggerMiddleware',
      'app.use(jsonBodyParserMiddleware',
      'app.use(corsMiddleware',
      'app.use(helmetMiddleware',
      'app.use(rateLimitMiddleware',
      "app.use('/api/v1'",
      'app.use(notFoundMiddleware',
      'app.use(errorHandlerMiddleware',
    ];
    const positions = registrations.map((token) => source.indexOf(token));
    for (const pos of positions) {
      expect(pos).toBeGreaterThan(-1);
    }
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });
});

describe('Pipeline global — rate limit (US-091 / NT-07)', () => {
  let rateApp: typeof app;

  beforeAll(async () => {
    vi.stubEnv('RATE_LIMIT_MAX', '2');
    vi.resetModules();
    rateApp = (await import('../../src/app.js')).default;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('NT-07: superar RATE_LIMIT_MAX → 429 con cabecera Retry-After', async () => {
    await request(rateApp).get('/health'); // 1
    await request(rateApp).get('/health'); // 2 (límite alcanzado)
    const res = await request(rateApp).get('/health'); // 3 → excede
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    const hasRetryAfter =
      res.headers['retry-after'] !== undefined || res.headers['ratelimit-reset'] !== undefined;
    expect(hasRetryAfter).toBe(true);
  });
});
