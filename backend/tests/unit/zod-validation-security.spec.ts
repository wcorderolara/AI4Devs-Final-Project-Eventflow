// Tests de seguridad — US-092 / SEC-001 (SEC-T-01..SEC-T-03).
// Inyección de role admin, campos extra maliciosos y no-log/no-exposición de datos sensibles.
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../src/shared/interface/middlewares/validate-request.middleware.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import { RegisterUserRequestSchema } from '../../src/modules/identity-access/dto/index.js';
import { logger } from '../../src/shared/infrastructure/logger/index.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const registerSchema = z.object({ body: RegisterUserRequestSchema });

const validBody = {
  email: 'user@example.com',
  password: 'Secret1234',
  name: 'Ana',
  role: 'organizer',
  captchaToken: 'tok',
} as const;

function run(body: Record<string, unknown>) {
  const mw = validateRequestMiddleware(registerSchema);
  const req = createMockRequest({ body, params: {}, query: {}, method: 'POST', path: '/api/v1/auth/register' });
  const next = vi.fn();
  mw(req, asResponse(createMockResponse()), next);
  return { req, next };
}

describe('Seguridad de validación Zod — US-092 SEC-001', () => {
  it('SEC-T-01: role "admin" es rechazado (enum organizer|vendor)', () => {
    const { req, next } = run({ ...validBody, role: 'admin' });
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
    expect(req.validated).toBeUndefined();
  });

  it('SEC-T-02: campo extra malicioso es rechazado y no llega al controlador', () => {
    const { req, next } = run({ ...validBody, isAdmin: true });
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);
    expect(req.validated).toBeUndefined();
  });

  it('SEC-T-03: el valor del password no aparece en details ni en los logs', () => {
    const spy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const secret = 'leakcanary'; // inválido (sin mayúscula ni dígito): valor que NO debe filtrarse
    const { next } = run({ ...validBody, password: secret });

    const err = next.mock.calls[0]?.[0] as ValidationError;
    const detailsSerialized = JSON.stringify(err.details);
    expect(detailsSerialized).not.toContain(secret);

    const logsSerialized = JSON.stringify(spy.mock.calls);
    expect(logsSerialized).not.toContain(secret);
    expect(logsSerialized).toContain('body.password'); // solo el nombre del campo

    spy.mockRestore();
  });
});
