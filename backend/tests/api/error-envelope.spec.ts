// Tests de integración (Supertest) — US-093 / QA-002 (IT-01..IT-10; NT-01..NT-10 solapados).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildErrorTestApp } from '../helpers/error-test-app.js';

const app = buildErrorTestApp();

function expectNoStack(body: unknown): void {
  expect(JSON.stringify(body)).not.toContain('at ');
}

describe('errorHandlerMiddleware — envelope anidado (US-093 QA-002)', () => {
  it('IT-01: ValidationError → 400 VALIDATION_ERROR con details[] y correlationId', async () => {
    const res = await request(app).get('/validation');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(1);
    expect(res.body.error.details[0]).toEqual({ field: 'email', message: 'Invalid email' });
    expect(typeof res.body.error.correlationId).toBe('string');
    expect(res.body.error.correlationId.length).toBeGreaterThan(0);
  });

  it('IT-02: AuthenticationError → 401 AUTHENTICATION_REQUIRED; sin stack', async () => {
    const res = await request(app).get('/auth');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    expectNoStack(res.body);
  });

  it('IT-03: AuthorizationError(false) → 403 FORBIDDEN; sin stack', async () => {
    const res = await request(app).get('/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expectNoStack(res.body);
  });

  it('IT-04: AuthorizationError(masked) → 404 RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/masked');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('IT-05: NotFoundError → 404 RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/notfound');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('IT-06: ConflictError → 409 CONFLICT; sin stack', async () => {
    const res = await request(app).get('/conflict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expectNoStack(res.body);
  });

  it('IT-07: BusinessRuleViolationError → 422 BUSINESS_RULE_VIOLATION con details[]', async () => {
    const res = await request(app).get('/business');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.details).toHaveLength(1);
  });

  it('IT-07b: RateLimitError → 429 RATE_LIMIT_EXCEEDED con Retry-After', async () => {
    const res = await request(app).get('/ratelimit');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.headers['retry-after']).toBe('30');
  });

  it('IT-08: Error genérico → 500 INTERNAL_ERROR; mensaje genérico; sin stack', async () => {
    const res = await request(app).get('/internal');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Error interno del servidor.');
    expectNoStack(res.body);
    expect(JSON.stringify(res.body)).not.toContain('postgres://');
  });

  it('IT-09: error.correlationId presente en 4xx y 5xx', async () => {
    for (const path of ['/validation', '/auth', '/masked', '/internal']) {
      const res = await request(app).get(path);
      expect(typeof res.body.error.correlationId).toBe('string');
      expect(res.body.error.correlationId.length).toBeGreaterThan(0);
    }
  });

  it('IT-10: response header X-Correlation-Id coincide con error.correlationId', async () => {
    const res = await request(app).get('/internal').set('x-correlation-id', '44444444-4444-4444-8444-444444444444');
    expect(res.headers['x-correlation-id']).toBe('44444444-4444-4444-8444-444444444444');
    expect(res.body.error.correlationId).toBe('44444444-4444-4444-8444-444444444444');
  });
});
