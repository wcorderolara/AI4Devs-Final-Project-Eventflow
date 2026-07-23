// Tests unitarios — US-093 / QA-001 (UT-01..UT-07).
// Helpers success()/failure(), correlationIdMiddleware, jerarquía de errores, maskedAs404.
import { describe, it, expect, vi } from 'vitest';
import { success } from '../../src/shared/response/success.js';
import { failure } from '../../src/shared/response/failure.js';
import { correlationIdMiddleware } from '../../src/shared/interface/middlewares/correlation-id.middleware.js';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleViolationError,
  RateLimitError,
  ErrorCodes,
} from '../../src/shared/domain/errors/index.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('response helpers — US-093 QA-001', () => {
  it('UT-01: success(data, correlationId) → envelope con data, meta.correlationId, meta.timestamp ISO', () => {
    const env = success({ id: '1', name: 'Ana' }, 'cid-1');
    expect(env.data).toEqual({ id: '1', name: 'Ana' });
    expect(env.meta.correlationId).toBe('cid-1');
    expect(env.meta.timestamp).toBe(new Date(env.meta.timestamp).toISOString());
    expect(env).not.toHaveProperty('error');
  });

  it('UT-02: failure(code, message, undefined, cid) → error envelope sin details', () => {
    const env = failure(ErrorCodes.AUTHENTICATION_REQUIRED, 'Auth requerida', undefined, 'cid-2');
    expect(env.error.code).toBe('AUTHENTICATION_REQUIRED');
    expect(env.error.correlationId).toBe('cid-2');
    expect(env.error.details).toBeUndefined();
  });

  it('UT-03: failure(VALIDATION_ERROR, msg, details, cid) → incluye details[]', () => {
    const env = failure(ErrorCodes.VALIDATION_ERROR, 'Inválido', [{ field: 'email', message: 'Formato inválido' }], 'cid-3');
    expect(env.error.code).toBe('VALIDATION_ERROR');
    expect(env.error.details).toHaveLength(1);
    expect(env.error.details?.[0]).toEqual({ field: 'email', message: 'Formato inválido' });
  });
});

describe('correlationIdMiddleware — US-093 QA-001', () => {
  it('UT-04: reutiliza el X-Correlation-Id entrante', () => {
    const req = createMockRequest({ headers: { 'x-correlation-id': '33333333-3333-4333-8333-333333333333' } });
    const res = createMockResponse();
    const next = vi.fn();
    correlationIdMiddleware(req, asResponse(res), next);
    expect(req.correlationId).toBe('33333333-3333-4333-8333-333333333333');
    expect(res.headers['x-correlation-id']).toBe('33333333-3333-4333-8333-333333333333');
    expect(next).toHaveBeenCalledWith();
  });

  it('UT-05: genera UUID v4 cuando no hay header', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = vi.fn();
    correlationIdMiddleware(req, asResponse(res), next);
    expect(req.correlationId ?? '').toMatch(UUID_V4);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
  });
});

describe('jerarquía de errores — US-093 QA-001', () => {
  it('UT-06: AuthorizationError(msg, true).maskedAs404 === true', () => {
    const err = new AuthorizationError('Acceso denegado', true);
    expect(err.maskedAs404).toBe(true);
    expect(err.code).toBe('FORBIDDEN');
    const notMasked = new AuthorizationError();
    expect(notMasked.maskedAs404).toBe(false);
  });

  it('UT-07: cada subclase de DomainError instancia con su code', () => {
    expect(new ValidationError('x', [{ field: 'a', message: 'b' }]).code).toBe('VALIDATION_ERROR');
    expect(new AuthenticationError().code).toBe('AUTHENTICATION_REQUIRED');
    expect(new AuthorizationError().code).toBe('FORBIDDEN');
    expect(new NotFoundError().code).toBe('RESOURCE_NOT_FOUND');
    expect(new ConflictError().code).toBe('CONFLICT');
    expect(new BusinessRuleViolationError('CURRENCY_IMMUTABLE', 'no').code).toBe('CURRENCY_IMMUTABLE');
    expect(new RateLimitError(30).code).toBe('RATE_LIMIT_EXCEEDED');
    expect(new RateLimitError(30).retryAfterSeconds).toBe(30);
  });
});
