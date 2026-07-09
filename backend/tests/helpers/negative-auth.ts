// Helpers de aserción para la suite negativa RBAC/ownership (US-112 / API-001, OBS-001).
// Centralizan: status + error code + `correlationId` (contrato US-093: `error.correlationId`, NO
// `meta.correlationId`) + ausencia de leaks. También `agentFor` para sesiones reales (DB-gated).
import { expect } from 'vitest';
import request from 'supertest';
import type { Response } from 'supertest';
import type { Express } from 'express';

const CAPTCHA = '__test__';

/** Códigos de error de seguridad esperados por status. */
export const AUTH_ERROR_CODES = {
  401: 'AUTHENTICATION_REQUIRED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
} as const;

/**
 * Asserta un rechazo de seguridad: status esperado, error envelope estándar con `code` del catálogo
 * y `correlationId` presente. Si se pasa `correlationId`, verifica el echo.
 */
export function expectAuthError(
  res: Response,
  status: 401 | 403 | 404,
  opts: { correlationId?: string } = {},
): void {
  expect(res.status).toBe(status);
  expect(res.body?.error?.code).toBe(AUTH_ERROR_CODES[status]);
  expect(typeof res.body?.error?.correlationId).toBe('string');
  expect((res.body.error.correlationId as string).length).toBeGreaterThan(0);
  if (opts.correlationId) expect(res.body.error.correlationId).toBe(opts.correlationId);
}

/** Substrings prohibidos en respuestas negativas (SEC-06/AC-07). */
const FORBIDDEN_LEAK_MARKERS = [
  'stack',
  'passwordHash',
  'SESSION_SECRET',
  'RECAPTCHA_SECRET',
  'eventflow_session=',
  'Bearer ',
  'prisma',
  'SELECT ',
  'node_modules',
];

/** Asserta que la respuesta no filtra stack/SQL/secretos/tokens/cookies ni internals. */
export function expectNoLeak(res: Response): void {
  const serialized = JSON.stringify(res.body);
  for (const marker of FORBIDDEN_LEAK_MARKERS) {
    expect(serialized).not.toContain(marker);
  }
}

/**
 * Registra + loguea un usuario del rol dado y devuelve un supertest agent con la cookie de sesión.
 * Requiere BD (register/login persisten). Usar sólo dentro de bloques `describe.skipIf(!dbUp)`.
 */
export async function agentFor(
  app: Express,
  role: 'organizer' | 'vendor',
  tag = 'us112',
): Promise<ReturnType<typeof request.agent>> {
  const email = `${tag}_${role}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: role, role, captchaToken: CAPTCHA });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}
