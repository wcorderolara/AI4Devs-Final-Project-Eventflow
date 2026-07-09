// Tests de integración de GET /health con Supertest (US-089 / QA-002, SEC-002).
// Cubren AC-02, SEC-01 (público), SEC-04 (headers Helmet). Importan `app` de src/app.ts
// SIN llamar listen (Supertest abre un servidor efímero interno).
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('GET /health (US-089)', () => {
  it('TS-02: responde 200 con { status: "ok", version: string, uptimeMs: number }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.uptimeMs).toBe('number');
    expect(res.body.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it('AUTH-TS-01: sin cabecera Authorization responde 200 (endpoint público, SEC-01)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(401);
  });

  it('SEC-04: incluye security headers de Helmet en la respuesta', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
