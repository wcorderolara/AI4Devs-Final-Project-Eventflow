// Tests unitarios de correlationIdMiddleware (US-091 / QA-001). AC-01, EC-01.
import { describe, it, expect, vi } from 'vitest';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

describe('correlationIdMiddleware (US-091)', () => {
  it('TS-01: genera un UUID y lo devuelve en la cabecera x-correlation-id', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = vi.fn();

    correlationIdMiddleware(req, asResponse(res), next);

    expect(typeof req.correlationId).toBe('string');
    expect((req.correlationId ?? '').length).toBeGreaterThan(0);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('EC-01: reutiliza el x-correlation-id entrante', () => {
    const req = createMockRequest({ headers: { 'x-correlation-id': '22222222-2222-4222-8222-222222222222' } });
    const res = createMockResponse();
    const next = vi.fn();

    correlationIdMiddleware(req, asResponse(res), next);

    expect(req.correlationId).toBe('22222222-2222-4222-8222-222222222222');
    expect(res.headers['x-correlation-id']).toBe('22222222-2222-4222-8222-222222222222');
    expect(next).toHaveBeenCalledOnce();
  });
});
