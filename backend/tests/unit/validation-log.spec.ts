// Test de observabilidad — US-092 / OBS-001.
// El log `warn` de validación tiene formato estructurado (event, correlationId, method, path,
// fields) y NUNCA incluye valores de campos (prevención de PII: password, captchaToken, email).
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../src/shared/interface/middlewares/validate-request.middleware.js';
import { RegisterUserRequestSchema } from '../../src/modules/identity-access/dto/index.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const registerSchema = z.object({ body: RegisterUserRequestSchema });

describe('Log de validación sin PII — US-092 OBS-001', () => {
  it('emite warn estructurado con fields (nombres) y sin valores', () => {
    const spy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const req = createMockRequest({
      body: { email: 'leakemail', password: 'leakcanary', name: 'Ana', role: 'organizer', captchaToken: 'tok' },
      params: {},
      query: {},
      method: 'POST',
      path: '/api/v1/auth/register',
      correlationId: 'cid-123',
    });
    const next = vi.fn();

    validateRequestMiddleware(registerSchema)(req, asResponse(createMockResponse()), next);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0]?.[0] as {
      event: string;
      correlationId: string;
      method: string;
      path: string;
      fields: string[];
    };
    expect(payload.event).toBe('validation_failed');
    expect(payload.correlationId).toBe('cid-123');
    expect(payload.method).toBe('POST');
    expect(payload.path).toBe('/api/v1/auth/register');
    expect(Array.isArray(payload.fields)).toBe(true);
    expect(payload.fields).toContain('body.email');

    // Ningún valor de campo se filtra al log.
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('leakemail');
    expect(serialized).not.toContain('leakcanary');

    spy.mockRestore();
  });
});
