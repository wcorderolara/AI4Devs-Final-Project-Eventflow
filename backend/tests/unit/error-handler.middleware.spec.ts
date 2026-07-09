// Tests unitarios de errorHandlerMiddleware + requestLogger (US-091 / QA-003). AC-07; SEC-001, SEC-002.
import { describe, it, expect, vi } from 'vitest';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import { requestLoggerMiddleware } from '../../src/shared/interface/middlewares/request-logger.middleware.js';
import { UnauthorizedError } from '../../src/shared/domain/errors/unauthorized.error.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

describe('errorHandlerMiddleware (US-091)', () => {
  it('TS-05: error genérico → 500, mensaje genérico, SIN stack en la respuesta', () => {
    const res = createMockResponse();
    const req = createMockRequest({ correlationId: 'c1' });
    errorHandlerMiddleware(new Error('secret internal detail'), req, asResponse(res), vi.fn());

    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      correlationId: 'c1',
    });
    expect((res.body as Record<string, unknown>).stack).toBeUndefined();
    // El mensaje real del error nunca se filtra en 5xx.
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });

  it('UnauthorizedError → 401 con code UNAUTHORIZED', () => {
    const res = createMockResponse();
    errorHandlerMiddleware(new UnauthorizedError(), createMockRequest({ correlationId: 'c2' }), asResponse(res), vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', correlationId: 'c2' });
  });

  it('ValidationError → 400 con details', () => {
    const res = createMockResponse();
    const err = new ValidationError('Validation failed', [{ field: 'body.email', message: 'Invalid email' }]);
    errorHandlerMiddleware(err, createMockRequest({ correlationId: 'c3' }), asResponse(res), vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((res.body as { details?: unknown[] }).details).toHaveLength(1);
  });
});

describe('requestLoggerMiddleware (US-091 / SEC-002)', () => {
  it('no registra el header Authorization ni secrets en el log', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const req = createMockRequest({
      headers: { authorization: 'Bearer super-secret-token' },
      body: { password: 'hunter2', captchaToken: '__test__' },
      correlationId: 'c9',
      method: 'POST',
      path: '/x',
    });
    const res = createMockResponse();
    const next = vi.fn();

    requestLoggerMiddleware(req, asResponse(res), next);
    res.emit('finish');

    const logged = JSON.stringify(spy.mock.calls).toLowerCase();
    expect(logged).not.toContain('authorization');
    expect(logged).not.toContain('super-secret-token');
    expect(logged).not.toContain('hunter2');
    expect(JSON.stringify(spy.mock.calls)).toContain('c9');
    expect(next).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
