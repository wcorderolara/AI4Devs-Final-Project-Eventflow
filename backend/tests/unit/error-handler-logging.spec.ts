// Tests de observabilidad — US-093 / OBS-001 (OBS-01..OBS-03).
// El errorHandlerMiddleware loguea 4xx a `warn` y 5xx a `error` (con stack); el masking se registra;
// el stack va al log pero NUNCA a la respuesta.
import { describe, it, expect, vi } from 'vitest';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { AuthorizationError } from '../../src/shared/domain/errors/authorization.error.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

function run(err: unknown, correlationId = 'cid') {
  const req = createMockRequest({ correlationId, method: 'GET', path: '/x' });
  const res = createMockResponse();
  errorHandlerMiddleware(err, req, asResponse(res), vi.fn());
  return res;
}

describe('errorHandlerMiddleware — logging (US-093 OBS-001)', () => {
  it('OBS-01: 4xx (ValidationError) → log warn con event domain_error', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    run(new ValidationError('Validation failed', [{ field: 'email', message: 'x' }]));
    const payload = warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.event).toBe('domain_error');
    expect(payload.code).toBe('VALIDATION_ERROR');
    expect(payload.httpStatus).toBe(400);
    expect(payload.correlationId).toBe('cid');
    warn.mockRestore();
  });

  it('OBS-02: 5xx → log error con stack; response SIN stack', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const res = run(new Error('boom internal'));
    const payload = errorSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.event).toBe('unexpected_error');
    expect(typeof payload.stack).toBe('string');
    // El stack está en el log, nunca en la respuesta.
    expect(JSON.stringify(res.body)).not.toContain('boom internal');
    expect((res.body as { error: { message: string } }).error.message).toBe('Error interno del servidor.');
    errorSpy.mockRestore();
  });

  it('OBS-03: masking 403→404 → log warn authorization_masked_as_404 con realStatus 403', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const res = run(new AuthorizationError('denegado', true));
    const payload = warn.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.event).toBe('authorization_masked_as_404');
    expect(payload.realStatus).toBe(403);
    expect(res.statusCode).toBe(404);
    warn.mockRestore();
  });
});
