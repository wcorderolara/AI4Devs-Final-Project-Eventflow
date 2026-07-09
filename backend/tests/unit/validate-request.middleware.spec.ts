// Tests unitarios de validateRequestMiddleware (US-091 / QA-002). AC-06, NT-06.
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../src/shared/interface/middlewares/validate-request.middleware.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const schema = z.object({ body: z.object({ email: z.string().email() }) });

describe('validateRequestMiddleware (US-091)', () => {
  it('TS-04: body válido → req.validated disponible; next() sin error', () => {
    const mw = validateRequestMiddleware(schema);
    const req = createMockRequest({ body: { email: 'user@example.com' }, params: {}, query: {} });
    const next = vi.fn();

    mw(req, asResponse(createMockResponse()), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.validated).toBeDefined();
  });

  it('NT-06: body inválido → next(ValidationError) con details por campo', () => {
    const mw = validateRequestMiddleware(schema);
    const req = createMockRequest({ body: { email: 'not-an-email' }, params: {}, query: {} });
    const next = vi.fn();

    mw(req, asResponse(createMockResponse()), next);

    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toBeInstanceOf(Array);
    expect(err.details[0].field).toBe('body.email');
    expect(typeof err.details[0].message).toBe('string');
  });
});
