// Helpers HTTP compartidos por los specs de API: captcha de test, datos únicos y sesiones por rol
// vía registro + login públicos. Requieren BD: usar sólo dentro de `describe.skipIf(!dbUp)`.
import request from 'supertest';
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';

/** Token aceptado por el captcha de test (`CAPTCHA_PROVIDER` no real). */
export const CAPTCHA = '__test__';
export const TEST_PASSWORD = 'Secret1234';

export type Agent = ReturnType<typeof request.agent>;
export type TestRole = 'organizer' | 'vendor' | 'admin';

/** Sufijo único `<timestamp>_<aleatorio>`. */
export const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

/** Email único `<prefix>_<timestamp>_<aleatorio>@eventflow.test`. */
export const uniqEmail = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

export interface SessionOpts {
  /** Prefijo del email generado (`<tag>_<role>_…`). */
  tag?: string;
  /** Nombre enviado para organizer/admin (default: el rol). */
  name?: string;
  /** Nombre comercial enviado para vendor (default: 'Vendor Demo SA'). */
  businessName?: string;
  /** Requerido para `admin`: se registra como organizer y se promueve por Prisma. */
  prisma?: PrismaClient;
}

function registerPayload(role: TestRole, email: string, opts: SessionOpts): Record<string, unknown> {
  return {
    acceptedTerms: true,
    email,
    password: TEST_PASSWORD,
    ...(role === 'vendor' ? { businessName: opts.businessName ?? 'Vendor Demo SA' } : { name: opts.name ?? role }),
    // El registro público no admite admin (SEC-08): se registra como organizer y se promueve.
    role: role === 'admin' ? 'organizer' : role,
    captchaToken: CAPTCHA,
  };
}

function promoteToAdmin(opts: SessionOpts, where: { id: string } | { email: string }): Promise<unknown> {
  if (!opts.prisma) throw new Error('registerLogin/agentFor(admin) requiere opts.prisma');
  return opts.prisma.user.update({ where, data: { role: 'admin' } });
}

async function login(agent: Agent, email: string): Promise<void> {
  await agent.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD, captchaToken: CAPTCHA });
}

/** Registra + loguea un usuario del rol dado; devuelve el agent con cookie de sesión y el `userId`. */
export async function registerLogin(
  app: Express,
  role: TestRole,
  opts: SessionOpts = {},
): Promise<{ agent: Agent; userId: string; email: string }> {
  const email = uniqEmail(`${opts.tag ?? 'test'}_${role}`);
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send(registerPayload(role, email, opts));
  const userId = reg.body.data.id as string;
  if (role === 'admin') await promoteToAdmin(opts, { id: userId });
  await login(agent, email);
  return { agent, userId, email };
}

/** Igual que `registerLogin` pero sin leer el body del registro; devuelve sólo el agent. */
export async function agentFor(app: Express, role: TestRole, opts: SessionOpts = {}): Promise<Agent> {
  const email = uniqEmail(`${opts.tag ?? 'test'}_${role}`);
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send(registerPayload(role, email, opts));
  if (role === 'admin') await promoteToAdmin(opts, { email });
  await login(agent, email);
  return agent;
}

/** Versiones ligadas a `app` + opciones fijas, para conservar las llamadas `agentFor(role)` de cada spec. */
export function sessionHelpers(app: Express, opts: SessionOpts = {}) {
  return {
    agentFor: (role: TestRole): Promise<Agent> => agentFor(app, role, opts),
    registerLogin: (role: TestRole) => registerLogin(app, role, opts),
  };
}

/**
 * Cookie de sesión firmada como `cookieParser(SESSION_SECRET)` (`s:<sid>.<hmac>`), lista para
 * `.set('Cookie', …)`. Para sesiones creadas directamente por Prisma.
 */
export function sessionCookie(sid: string): string {
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- firmador runtime (test-only)
  const signature = require('cookie-signature') as { sign: (value: string, secret: string) => string };
  return `${cookieName}=${encodeURIComponent(`s:${signature.sign(sid, cookieSecret)}`)}`;
}
