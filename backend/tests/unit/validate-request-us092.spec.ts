// Tests unitarios de validateRequestMiddleware — US-092 / QA-001 (UT-01..UT-05).
// Cubren happy path, campo faltante, campo extra (.strict()), tipo incorrecto y reutilización.
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../src/shared/interface/middlewares/validate-request.middleware.js';
import { ValidationError } from '../../src/shared/domain/errors/validation.error.js';
import {
  RegisterUserRequestSchema,
  type RegisterUserRequest,
} from '../../src/modules/identity-access/dto/index.js';
import { createMockRequest, createMockResponse, asResponse } from '../helpers/express-mocks.js';

const registerSchema = z.object({ body: RegisterUserRequestSchema });

const validBody = {
  email: 'User@Example.com',
  password: 'Secret1234',
  name: 'Ana',
  role: 'organizer',
  acceptedTerms: true,
  captchaToken: 'tok',
} as const;

function run(schema: z.ZodType, init: Partial<Parameters<typeof createMockRequest>[0]>) {
  const mw = validateRequestMiddleware(schema);
  const req = createMockRequest({ body: {}, params: {}, query: {}, ...init });
  const next = vi.fn();
  mw(req, asResponse(createMockResponse()), next);
  return { req, next };
}

describe('validateRequestMiddleware — US-092 QA-001', () => {
  it('UT-01: body válido → next() sin error; req.validated.body tipado y normalizado', () => {
    const { req, next } = run(registerSchema, { body: { ...validBody } });
    expect(next).toHaveBeenCalledWith();
    const body = req.validated?.body as RegisterUserRequest;
    expect(body).toBeDefined();
    // transform: email normalizado a lowercase
    expect(body.email).toBe('user@example.com');
  });

  it('UT-02: campo requerido faltante → ValidationError con details; req.validated no se puebla', () => {
    const { req, next } = run(registerSchema, { body: { ...validBody, email: undefined } });
    const err = next.mock.calls[0]?.[0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details?.some((d) => d.field === 'body.email')).toBe(true);
    expect(req.validated).toBeUndefined();
  });

  it('UT-03: campo extra (.strict()) → ValidationError; el campo no pasa al controlador', () => {
    const { req, next } = run(registerSchema, { body: { ...validBody, hacker: 'x' } });
    const err = next.mock.calls[0]?.[0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(req.validated).toBeUndefined();
  });

  it('UT-04: tipo de campo incorrecto → details indica el campo afectado', () => {
    const { next } = run(registerSchema, { body: { ...validBody, name: 123 } });
    const err = next.mock.calls[0]?.[0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details?.some((d) => d.field === 'body.name')).toBe(true);
  });

  it('UT-05: mismo middleware reutilizable con distintos schemas', () => {
    const querySchema = z.object({ query: z.object({ q: z.string() }).strict() });

    const okQuery = run(querySchema, { query: { q: 'hi' } });
    expect(okQuery.next).toHaveBeenCalledWith();

    const badQuery = run(querySchema, { query: {} });
    expect(badQuery.next.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // El schema de registro sigue funcionando de forma independiente.
    const okReg = run(registerSchema, { body: { ...validBody } });
    expect(okReg.next).toHaveBeenCalledWith();
  });
});
