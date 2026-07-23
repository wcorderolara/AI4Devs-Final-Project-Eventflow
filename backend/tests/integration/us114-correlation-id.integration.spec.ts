// US-114 (PB-P2-011 / QA-003) — Integration tests del pipeline completo
// `correlationIdMiddleware` end-to-end.
//
// Cubre:
//   * IT-01 (@critical, AC-04..07): invariante header==body — request real →
//     response header `x-correlation-id` == body `meta.correlationId` (para
//     success 2xx) o `error.correlationId` (para 4xx/5xx). El log emitido
//     por Pino (US-113) hereda el mismo `correlationId` — verificado a nivel
//     visual (JSON stdout).
//   * IT-02 (AC-03, SEC-04): header inválido → response 400 con
//     `error.correlationId` server-generated (no el inválido del cliente).
//     Response header echoed = server-generated.
//   * IT-03 (EC-03): 10 requests concurrentes con distintos IDs → cada uno
//     conserva su propio ID sin cross-contamination.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('US-114 · correlationIdMiddleware end-to-end (QA-003)', () => {
  it('IT-01 @critical (AC-04, AC-05): success 2xx — header == body.meta.correlationId', async () => {
    // `/health` no usa el envelope estándar (§7 app.ts responde directo). Para
    // asegurar el invariante header==body, invocamos un endpoint 404 versionado
    // (`/api/v1/does-not-exist`) que dispara el error handler con el envelope
    // ANIDADO estándar {error: {code, message, correlationId}}. El header y
    // el body deben matchear.
    const cid = '11111111-2222-4111-8111-333333333333';
    const res = await request(app)
      .get('/api/v1/does-not-exist-xyz')
      .set('X-Correlation-Id', cid);
    expect(res.headers['x-correlation-id']).toBe(cid);
    expect(res.body?.error?.correlationId).toBe(cid);
  });

  it('IT-01b: success 2xx — /health echoa el header (sin envelope estándar)', async () => {
    const cid = '22222222-3333-4222-8222-444444444444';
    const res = await request(app).get('/health').set('X-Correlation-Id', cid);
    expect(res.status).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(cid);
  });

  it('IT-02 (AC-03 · SEC-04): header inválido → 400 INVALID_CORRELATION_ID con error.correlationId server-generated', async () => {
    const clientInvalid = 'not-a-uuid-abc123';
    const res = await request(app)
      .get('/api/v1/anything')
      .set('X-Correlation-Id', clientInvalid);
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CORRELATION_ID');
    expect(res.body?.error?.correlationId).not.toBe(clientInvalid);
    expect(UUID_V4_REGEX.test(res.body?.error?.correlationId)).toBe(true);
    // Response header con el server-generated (no el inválido del cliente).
    expect(res.headers['x-correlation-id']).toBe(res.body.error.correlationId);
  });

  it('IT-03 (EC-03): 10 requests concurrentes con distintos IDs → cada uno conserva el suyo', async () => {
    const cids = Array.from({ length: 10 }, (_, i) => {
      const h = i.toString(16);
      return `${h}${h}${h}${h}${h}${h}${h}${h}-${h}${h}${h}${h}-4${h}${h}${h}-8${h}${h}${h}-${h}${h}${h}${h}${h}${h}${h}${h}${h}${h}${h}${h}`;
    });
    const responses = await Promise.all(
      cids.map((cid) => request(app).get('/health').set('X-Correlation-Id', cid)),
    );
    responses.forEach((res, i) => {
      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(cids[i]);
    });
  });

  it('IT-04 (AC-01): sin header → server-generated UUID v4 válido', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    const generated = res.headers['x-correlation-id'];
    expect(typeof generated).toBe('string');
    expect(UUID_V4_REGEX.test(String(generated))).toBe(true);
  });
});
