// US-016 / QA-002 / QA-003 / SEC-001 — Integration + API tests para el endpoint admin.
// GET /api/v1/admin/events/:id con Supertest + Prisma test DB.
// Cubre AC-01, EC-01, EC-02, EC-03, AC-02 (bloqueo escritura), AUTH-TS-01..03, NT-01..05.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

const prisma = new PrismaClient();
let dbUp = false;
try {
  await Promise.race([
    prisma.$queryRawUnsafe('SELECT 1'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ]);
  dbUp = true;
} catch {
  dbUp = false;
}

const app = createApp();
const CAPTCHA = '__test__';
const uniqEmail = (p: string): string =>
  `us016_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;
const SOME_UUID = '11111111-1111-4111-8111-111111111111';

async function organizerAgent(): Promise<{ agent: ReturnType<typeof request.agent>; userId: string }> {
  const email = uniqEmail('org');
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ acceptedTerms: true, email, password: 'Secret1234', name: 'Org', role: 'organizer', captchaToken: CAPTCHA });
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  const user = await prisma.user.findUnique({ where: { email } });
  return { agent, userId: user!.id };
}

async function vendorAgent(): Promise<ReturnType<typeof request.agent>> {
  const email = uniqEmail('vendor');
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    businessName: 'Vendor Demo SA',
    role: 'vendor',
    captchaToken: CAPTCHA,
  });
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

async function adminAgent(): Promise<ReturnType<typeof request.agent>> {
  // No hay endpoint público para crear admins; se crea directamente en la BD y se abre sesión
  // vía repositorio de sesiones (mismo mecanismo que las suites SEED).
  const email = uniqEmail('admin');
  const password = 'Secret1234';
  await prisma.user.create({
    data: {
      email,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzYWx0c2FsdA$placeholder',
      fullName: 'Admin Demo',
      role: 'admin',
      status: 'active',
    },
  });
  // Sobrescribe el hash con uno real usando el use case de identidad: re-usamos el flujo login
  // creando el usuario con el hash proveniente de un register organizer temporal.
  // Truco: registramos un organizer con el mismo password, tomamos su hash y lo aplicamos al admin.
  const helperEmail = uniqEmail('adminhelp');
  await request(app).post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email: helperEmail,
    password,
    name: 'Helper',
    role: 'organizer',
    captchaToken: CAPTCHA,
  });
  const helper = await prisma.user.findUnique({ where: { email: helperEmail } });
  await prisma.user.update({ where: { email }, data: { passwordHash: helper!.passwordHash } });
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password, captchaToken: CAPTCHA });
  return agent;
}

let eventId = '';
let deletedEventId = '';

describe.skipIf(!dbUp)('US-016 QA-002 — GET /api/v1/admin/events/:id (integración)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE admin_actions, events, sessions, password_reset_tokens, users, event_types, locations RESTART IDENTITY CASCADE`,
    );
    await prisma.eventType.create({ data: { code: 'wedding', label: 'Wedding', isActive: true } });
    const loc = await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } });
    const { agent, userId } = await organizerAgent();
    const created = await agent
      .post('/api/v1/events')
      .send({
        eventTypeCode: 'wedding',
        eventDate: '2026-12-31',
        guestsCount: 100,
        locationId: loc.id,
        estimatedBudget: '1500.00',
        currencyCode: 'GTQ',
        languageCode: 'es-LATAM',
        name: 'Boda demo',
      })
      .expect(201);
    eventId = created.body.data.id as string;
    // Creamos otro evento y lo marcamos como soft-deleted directamente en la BD (EC-01).
    const created2 = await agent
      .post('/api/v1/events')
      .send({
        eventTypeCode: 'wedding',
        eventDate: '2026-12-31',
        guestsCount: 50,
        locationId: loc.id,
        estimatedBudget: '500.00',
        currencyCode: 'GTQ',
        languageCode: 'es-LATAM',
        name: 'Boda soft-deleted',
      })
      .expect(201);
    deletedEventId = created2.body.data.id as string;
    await prisma.event.update({
      where: { id: deletedEventId },
      data: { deletedAt: new Date('2026-06-01T00:00:00Z'), deletedBy: userId },
    });
  });

  it('TS-01 / AC-01: admin lee evento existente → 200 + AdminAction persistido con correlationId', async () => {
    const agent = await adminAgent();
    const res = await agent
      .get(`/api/v1/admin/events/${eventId}`)
      .set('x-correlation-id', '55555555-5555-4555-8555-555555555555')
      .expect(200);
    expect(res.body.data.id).toBe(eventId);
    expect(res.body.data.deleted).toBe(false);
    expect(res.body.data.owner).toMatchObject({ displayName: expect.any(String) });

    const action = await prisma.adminAction.findFirst({
      where: { action: 'view_event', targetId: eventId },
      orderBy: { createdAt: 'desc' },
    });
    expect(action).toBeTruthy();
    expect(action?.targetEntity).toBe('event');
    expect((action?.metadata as Record<string, unknown> | null)?.correlationId).toBe('55555555-5555-4555-8555-555555555555');
  });

  it('TS-03 / EC-01: admin lee evento soft-deleted → 200 con deleted=true y AdminAction', async () => {
    const agent = await adminAgent();
    const res = await agent.get(`/api/v1/admin/events/${deletedEventId}`).expect(200);
    expect(res.body.data.deleted).toBe(true);
    expect(res.body.data.deletedAt).not.toBeNull();
    const action = await prisma.adminAction.findFirst({
      where: { action: 'view_event', targetId: deletedEventId },
    });
    expect(action).toBeTruthy();
  });

  it('TS-04 / EC-02: evento inexistente → 404 y NO se registra AdminAction', async () => {
    const agent = await adminAgent();
    const before = await prisma.adminAction.count({ where: { action: 'view_event' } });
    const res = await agent.get(`/api/v1/admin/events/${SOME_UUID}`).expect(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    const after = await prisma.adminAction.count({ where: { action: 'view_event' } });
    expect(after).toBe(before);
  });

  it('TS-05 / EC-03: UUID inválido → 400 sin auditoría', async () => {
    const agent = await adminAgent();
    const before = await prisma.adminAction.count({ where: { action: 'view_event' } });
    const res = await agent.get('/api/v1/admin/events/not-a-uuid').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const after = await prisma.adminAction.count({ where: { action: 'view_event' } });
    expect(after).toBe(before);
  });
});

describe.skipIf(!dbUp)('US-016 QA-003 / SEC-001 — Autorización (RBAC + bloqueo escritura)', () => {
  it('NT-05 / AUTH-TS-03: anónimo → 401', async () => {
    const res = await request(app).get(`/api/v1/admin/events/${SOME_UUID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('NT-01 / AUTH-TS-02: organizer autenticado → 403', async () => {
    const { agent } = await organizerAgent();
    const res = await agent.get(`/api/v1/admin/events/${SOME_UUID}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('NT-02: vendor autenticado → 403', async () => {
    const agent = await vendorAgent();
    const res = await agent.get(`/api/v1/admin/events/${SOME_UUID}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-01: admin autenticado → 200 (evento válido)', async () => {
    const agent = await adminAgent();
    const res = await agent.get(`/api/v1/admin/events/${eventId}`);
    expect(res.status).toBe(200);
  });

  it('NT-03 / AC-02: admin intenta PATCH → 403 FORBIDDEN_WRITE', async () => {
    const agent = await adminAgent();
    const res = await agent.patch(`/api/v1/admin/events/${eventId}`).send({ name: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_WRITE');
  });

  it('NT-04 / AC-02: admin intenta DELETE → 403 FORBIDDEN_WRITE', async () => {
    const agent = await adminAgent();
    const res = await agent.delete(`/api/v1/admin/events/${eventId}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_WRITE');
  });

  it('NT-03b: organizer PATCH admin → 403 FORBIDDEN (rol falla antes del bloqueo write)', async () => {
    const { agent } = await organizerAgent();
    const res = await agent.patch(`/api/v1/admin/events/${eventId}`).send({});
    expect(res.status).toBe(403);
    // Aquí el motivo es rol incorrecto (FORBIDDEN), no FORBIDDEN_WRITE — el guard corre antes.
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
