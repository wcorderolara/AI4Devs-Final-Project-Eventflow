// Tests de seguridad (Supertest) — US-093 / SEC-001 (SEC-T-01..03, AUTH-TS-01..02).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildErrorTestApp } from '../helpers/error-test-app.js';

const app = buildErrorTestApp();

describe('errorHandlerMiddleware — seguridad (US-093 SEC-001)', () => {
  it('SEC-T-01: 500 no expone stack, paths ni SQL', async () => {
    const res = await request(app).get('/internal');
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('at '); // marker de stack trace
    expect(serialized).not.toContain('postgres://');
    expect(serialized).not.toContain('connection string');
    expect(res.body.error.message).toBe('Error interno del servidor.');
  });

  it('SEC-T-02 / AUTH-TS-01: AuthorizationError(masked) → 404 RESOURCE_NOT_FOUND (no 403/FORBIDDEN)', async () => {
    const res = await request(app).get('/masked');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.code).not.toBe('FORBIDDEN');
    expect(res.status).not.toBe(403);
  });

  it('AUTH-TS-02: 500 tiene mensaje genérico y sin campos técnicos extra', async () => {
    const res = await request(app).get('/internal');
    expect(res.body.error.message).toBe('Error interno del servidor.');
    // El objeto error solo contiene code, message, correlationId (sin stack/path/originalError).
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'correlationId', 'message']);
  });

  it('SEC-T-03: correlationId del envelope 500 coincide con el header X-Correlation-Id', async () => {
    const res = await request(app).get('/internal');
    expect(res.body.error.correlationId).toBe(res.headers['x-correlation-id']);
  });
});
