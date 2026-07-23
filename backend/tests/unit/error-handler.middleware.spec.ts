// Tests unitarios de errorHandlerMiddleware + requestLogger (US-091 / QA-003). AC-07; SEC-001, SEC-002.
//
// US-113 (PB-P2-010 / QA-004): el `requestLoggerMiddleware` migrado a Pino
// escribe a stdout via `SonicBoom` (fd=1) — bypasa `console.info`. La
// verificación de redacción de headers ahora se hace spyando el singleton
// Pino (`logger.info`) en vez de `console.info`. La cobertura completa de
// redacción (headers + secrets + PII + shape JSON + correlationId) vive en
// `us113-pino-logger.spec.ts` (UT) y `us113-request-logger.integration.spec.ts`
// (IT); este test se limita a validar el contrato pre-US-091 sobre el nuevo
// singleton.
import { describe, it, expect, vi } from 'vitest';
import { errorHandlerMiddleware } from '../../src/shared/interface/middlewares/error-handler.middleware.js';
import { requestLoggerMiddleware } from '../../src/shared/interface/middlewares/request-logger.middleware.js';
import { logger } from '../../src/shared/logger.js';
import { UnauthorizedError } from '../../src/shared/domain/errors/unauthorized.error.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

describe('errorHandlerMiddleware (US-091)', () => {
  it('TS-05: error genérico → 500, mensaje genérico, SIN stack en la respuesta', () => {
    const res = createMockResponse();
    const req = createMockRequest({ correlationId: 'c1' });
    errorHandlerMiddleware(new Error('secret internal detail'), req, asResponse(res), vi.fn());

    expect(res.statusCode).toBe(500);
    // US-093: envelope anidado + código canónico INTERNAL_ERROR.
    expect(res.body).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor.',
        correlationId: 'c1',
      },
    });
    expect((res.body as Record<string, unknown>).stack).toBeUndefined();
    // El mensaje real del error nunca se filtra en 5xx.
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });

  it('UnauthorizedError → 401 con code AUTHENTICATION_REQUIRED', () => {
    const res = createMockResponse();
    errorHandlerMiddleware(new UnauthorizedError(), createMockRequest({ correlationId: 'c2' }), asResponse(res), vi.fn());
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'AUTHENTICATION_REQUIRED', correlationId: 'c2' } });
  });

  it('ValidationError → 400 con details', () => {
    const res = createMockResponse();
    const err = new ValidationError('Validation failed', [{ field: 'body.email', message: 'Invalid email' }]);
    errorHandlerMiddleware(err, createMockRequest({ correlationId: 'c3' }), asResponse(res), vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect((res.body as { error: { details?: unknown[] } }).error.details).toHaveLength(1);
  });
});

describe('requestLoggerMiddleware (US-091 / SEC-002 → US-113 / QA-004)', () => {
  it('no registra el valor del header Authorization ni secrets en el log line emitido por Pino', () => {
    const spy = vi.spyOn(logger, 'info').mockImplementation((() => undefined) as never);
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

    // Todos los argumentos pasados a logger.info se acumulan; verificamos que
    // (a) NO haya filtración del VALOR del Bearer/password/captcha, y (b) el
    // header 'authorization' aparece con marker `[REDACTED]` (no filtra el valor).
    const flat = JSON.stringify(spy.mock.calls);
    expect(flat).not.toContain('super-secret-token');
    expect(flat).not.toContain('hunter2');
    expect(flat).toContain('[REDACTED]');
    expect(next).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
