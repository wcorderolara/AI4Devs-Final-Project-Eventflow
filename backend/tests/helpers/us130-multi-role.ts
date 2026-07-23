// US-130 / PB-P2-018 — Fixtures multi-cuenta por rol + helper de autenticación para la suite
// negativa extendida (QA-001; AC-04). Extiende `negative-auth.ts` (US-112) con:
//   • admin session (registro público bloquea `role=admin` por SEC-08 US-094 — se emite la
//     cookie firmada directamente vía Prisma + `cookie-signature`, mismo patrón que
//     us071-list-notifications.integration.spec.ts).
//   • organizer A/B (isolation cross-cuenta, BR-AUTH-009).
//   • vendor asignado / no asignado (assignment, BR-AUTH-007).
//   • activeEvent + assignedQuoteRequest (fixtures compuestos deterministas).
// Backend es la única fuente de verdad — todas las cookies se firman con `SESSION_SECRET`
// (ver `session-auth.ts`) y las sesiones persisten en la tabla `sessions`.
import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { Argon2idPasswordHasher } from '../../src/infrastructure/security/argon2id-password-hasher.js';

const CAPTCHA = '__test__';
const uniqTag = (label: string): string =>
  `us130_${label}_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

export type Agent = ReturnType<typeof request.agent>;

export interface RoleAgent {
  agent: Agent;
  userId: string;
  email: string;
  role: 'organizer' | 'vendor' | 'admin';
}

/** Registra + loguea un usuario (`organizer` | `vendor`) via API pública y retorna el agent. */
async function registerLoginPublic(
  app: Express,
  role: 'organizer' | 'vendor',
): Promise<RoleAgent> {
  const email = `${uniqTag(role)}@eventflow.test`;
  const agent = request.agent(app);
  const body =
    role === 'vendor'
      ? { acceptedTerms: true, email, password: 'Secret1234', businessName: 'Vendor Demo SA', role, captchaToken: CAPTCHA }
      : { acceptedTerms: true, email, password: 'Secret1234', name: role, role, captchaToken: CAPTCHA };
  const reg = await agent.post('/api/v1/auth/register').send(body);
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId: reg.body.data.id as string, email, role };
}

/**
 * Emite un agent con sesión `admin` sin pasar por el registro público (US-094 SEC-08 bloquea
 * `role=admin`). Persiste `User` + `Session` vía Prisma y firma la cookie con `SESSION_SECRET`.
 * DB-gated (usar solo dentro de `describe.skipIf(!dbUp)`).
 */
export async function adminAgent(app: Express, prisma: PrismaClient): Promise<RoleAgent> {
  const email = `${uniqTag('admin')}@eventflow.test`;
  const passwordHash = await new Argon2idPasswordHasher().hash('Secret1234');
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName: 'admin', role: 'admin', status: 'active' },
    select: { id: true },
  });
  // Sesión válida por 1h — suficiente para toda la suite; sin cache/rotación.
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt },
    select: { id: true },
  });
  const cookieSecret = process.env.SESSION_SECRET ?? '';
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'eventflow_session';
  // Firma HMAC exacta al patrón de `cookieParser(SESSION_SECRET)` (ver us071 integration).
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- runtime signer (test-only)
  const signature = require('cookie-signature') as { sign: (v: string, s: string) => string };
  const signedValue = `s:${signature.sign(session.id, cookieSecret)}`;
  const agent = request.agent(app);
  // Supertest `agent` mantiene el jar de cookies para requests subsecuentes.
  agent.jar.setCookie(`${cookieName}=${encodeURIComponent(signedValue)}; Path=/`);
  return { agent, userId: user.id, email, role: 'admin' };
}

/** Registra un `organizer` (registro público). Wrapper explícito para lectura del test. */
export function organizerAgent(app: Express): Promise<RoleAgent> {
  return registerLoginPublic(app, 'organizer');
}

/** Registra un `vendor` (registro público). Wrapper explícito para lectura del test. */
export function vendorAgent(app: Express): Promise<RoleAgent> {
  return registerLoginPublic(app, 'vendor');
}

/**
 * Crea un `VendorProfile` aprobado para un vendor recién registrado. Necesario para asignarlo
 * como destinatario de `QuoteRequest` (el registro público NO crea el perfil — es un paso
 * explícito post-registro, US-040).
 */
export async function vendorProfileFor(
  prisma: PrismaClient,
  userId: string,
  overrides: { businessName?: string } = {},
): Promise<{ id: string }> {
  const created = await prisma.vendorProfile.create({
    data: {
      userId,
      businessName: overrides.businessName ?? 'Vendor Demo SA',
      status: 'approved',
      languagesSupported: ['es-LATAM'],
    },
    select: { id: true },
  });
  return created;
}

/**
 * Crea + activa un evento owned por el organizer agent. Requiere que existan `event_types` y
 * `locations` de referencia (los tests semillan `wedding` + Guatemala en su beforeAll).
 */
export async function activeEvent(agent: Agent, locationId: string): Promise<string> {
  const created = await agent.post('/api/v1/events').send({
    eventTypeCode: 'wedding',
    eventDate: '2026-12-31',
    guestsCount: 50,
    locationId,
    estimatedBudget: '1000.00',
    currencyCode: 'GTQ',
    languageCode: 'es-LATAM',
  });
  const id = created.body.data.id as string;
  await agent.post(`/api/v1/events/${id}/activate`);
  return id;
}

/**
 * Crea una `QuoteRequest` asignada al vendor especificado sobre un evento activo del organizer.
 * Retorna el `id` del QR (asignado 1:1 al `vendorProfileId`). El `serviceCategoryId` debe
 * pre-existir (el test lo semilla en su beforeAll).
 */
export async function assignedQuoteRequest(
  organizer: Agent,
  eventId: string,
  vendorProfileId: string,
  serviceCategoryId: string,
): Promise<{ id: string }> {
  const res = await organizer.post(`/api/v1/events/${eventId}/quote-requests`).send({
    vendorProfileId,
    serviceCategoryId,
    brief: { summary: 's', requirements: ['r'], questions: ['q'] },
  });
  return { id: res.body.data.id as string };
}

/**
 * Semilla catálogos + locations comunes (ejecutar en `beforeAll` del bloque DB-gated). Vuelve
 * los IDs necesarios para componer eventos + QRs de prueba.
 */
export async function seedCommonCatalog(
  prisma: PrismaClient,
): Promise<{ locationId: string; serviceCategoryId: string }> {
  await prisma.eventType.upsert({
    where: { code: 'wedding' },
    update: {},
    create: { code: 'wedding', label: 'Wedding', isActive: true },
  });
  const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
  const cat = await prisma.serviceCategory.create({
    data: { code: `cat_${uniqTag('svc')}`, label: 'Catering', isActive: true },
  });
  return { locationId: loc.id, serviceCategoryId: cat.id };
}
