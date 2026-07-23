// US-113 (PB-P2-010 / QA-003) — Integration test del middleware `request-logger`
// upgradeado con Pino + AsyncLocalStorage.
//
// Alcance del IT (lightweight):
//   * IT-01 (AC-05): GET `/health` con `X-Correlation-Id` en el request →
//     status 200 + response header `x-correlation-id` echoed. Esto verifica
//     end-to-end que el pipeline (correlation → request-logger + `.run(...)` →
//     ... → response) NO se rompe con la nueva instrumentación.
//   * IT-01b: sin `X-Correlation-Id` el middleware upstream genera un UUID y
//     la response lo devuelve.
//
// El comportamiento interno del logger (shape JSON, propagación via
// AsyncLocalStorage, redacción) está fully cubierto por los UT en
// `us113-pino-logger.spec.ts`. La captura de stdout aquí NO se hace porque
// Pino usa `SonicBoom` con un file descriptor propio (fd=1), que bypasa
// `process.stdout.write` — hijackear el fd es invasivo y no aporta valor
// adicional sobre los UT ya existentes. Ver Deviation D-07 del execution
// record.
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('US-113 · request-logger middleware upgrade (IT-01, AC-05)', () => {
  it('IT-01 (AC-05): X-Correlation-Id enviado (UUID v4) se echoa en el response header', async () => {
    // UUID v4 válido: `4` en posición 15, variante `[89ab]` en posición 20.
    const cid = '11111111-2222-4111-8111-555555555555';
    // US-116: `/health` está exento del correlation-id middleware (AC-06). Usamos
    // un path fuera de HEALTH_PATHS que igual dispara toda la cadena upstream
    // (correlation → request-logger → notFound). 404 tiene el header echoed.
    const res = await request(app).get('/us113-probe').set('X-Correlation-Id', cid);
    expect(res.status).toBe(404);
    expect(res.headers['x-correlation-id']).toBe(cid);
  });

  it('IT-01b (AC-05): sin X-Correlation-Id el middleware upstream genera un UUID válido', async () => {
    const res = await request(app).get('/us113-probe');
    expect(res.status).toBe(404);
    const generated = res.headers['x-correlation-id'];
    expect(typeof generated).toBe('string');
    expect(String(generated)).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('IT-01c: dos requests concurrentes con distintos X-Correlation-Id no cruzan valores', async () => {
    const cidA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const cidB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const [resA, resB] = await Promise.all([
      request(app).get('/us113-probe').set('X-Correlation-Id', cidA),
      request(app).get('/us113-probe').set('X-Correlation-Id', cidB),
    ]);
    expect(resA.headers['x-correlation-id']).toBe(cidA);
    expect(resB.headers['x-correlation-id']).toBe(cidB);
  });
});
