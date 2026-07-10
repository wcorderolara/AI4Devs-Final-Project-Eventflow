// US-086 QA-002..005 / SEC-002 / SEED-001 — Integration (Supertest) del reset surgical Demo.
// TS-01 happy, TS-02 idempotencia, TS-03 auditoría AdminAction, TS-04 GET /status, TS-05 surgical
// (is_seed=false preservado), NT-01/02/04 autorización, NT-03/SEC-002 flag off → 404.
// Skip limpio sin BD (`describe.skipIf(!dbUp)`).
//
// El flag SEED_DEMO_ENABLED se activa ANTES de construir la app (el montaje de la ruta lo lee en
// `createApp()`). Un segundo app con el flag apagado valida el 404 (EC-01).
process.env.SEED_DEMO_ENABLED = 'true';

import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
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

const TABLES = [
  'ai_recommendations', 'ai_prompt_versions', 'reviews', 'booking_intents', 'quotes',
  'quote_requests', 'budget_items', 'budgets', 'event_tasks', 'events', 'vendor_services',
  'vendor_profiles', 'attachments', 'locations', 'service_categories', 'event_types',
  'notifications', 'admin_actions', 'sessions', 'password_reset_tokens', 'users',
].join(', ');

const app = createApp();

let uniqueCounter = 0;
function uniqEmail(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}${uniqueCounter}@us086.test`;
}

/** Registra un organizer, lo promueve a admin en BD y hace login → agent con sesión admin. */
async function adminAgent() {
  const email = uniqEmail('admin');
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'Admin', role: 'organizer', captchaToken: '__test__' });
  await prisma.user.update({ where: { email }, data: { role: 'admin' } });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: '__test__' });
  return { agent, email };
}

async function organizerAgent() {
  const email = uniqEmail('org');
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({ email, password: 'Secret1234', name: 'Org', role: 'organizer', captchaToken: '__test__' });
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: '__test__' });
  return agent;
}

describe.skipIf(!dbUp)('US-086 — Reset surgical Demo (endpoint HTTP)', () => {
  let admin: { agent: ReturnType<typeof request.agent>; email: string };

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE`);
    admin = await adminAgent();
  }, 60_000);

  it('TS-01: reset admin con flag activo → 202 + ResetReport consistente', async () => {
    const res = await admin.agent.post('/api/v1/admin/seed/reset').send({ reason: 'demo test' });
    expect(res.status).toBe(202);
    const report = res.body.data;
    expect(report.entitiesDeleted).toBeTypeOf('object');
    expect(report.entitiesReseeded).toBeTypeOf('object');
    expect(report.seedVersion).toBeTypeOf('string');
    expect(report.correlationId).toMatch(/[0-9a-f-]{16,}/);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    // Repobló datos seed.
    expect(await prisma.user.count({ where: { isSeed: true } })).toBeGreaterThan(0);
    expect(await prisma.event.count({ where: { isSeed: true } })).toBeGreaterThan(0);
    expect(await prisma.aIRecommendation.count({ where: { isSeed: true } })).toBe(8);
  }, 60_000);

  it('TS-03: AdminAction SEED_RESET registrado (isSeed=false, correlationId en metadata)', async () => {
    const action = await prisma.adminAction.findFirst({
      where: { action: 'SEED_RESET', targetEntity: 'seed-demo' },
      orderBy: { createdAt: 'desc' },
    });
    expect(action).not.toBeNull();
    expect(action!.isSeed).toBe(false);
    expect(action!.adminUserId).toBeTypeOf('string');
    expect((action!.metadata as { correlationId?: string }).correlationId).toBeTypeOf('string');
  });

  it('TS-05 / SEC-04: el usuario admin (is_seed=false) sobrevive al reset surgical', async () => {
    const before = await prisma.user.findUnique({ where: { email: admin.email } });
    expect(before).not.toBeNull();
    await admin.agent.post('/api/v1/admin/seed/reset').send();
    const after = await prisma.user.findUnique({ where: { email: admin.email } });
    expect(after).not.toBeNull();
    expect(after!.id).toBe(before!.id);
    expect(after!.isSeed).toBe(false);
  }, 60_000);

  it('TS-02: idempotencia — dos resets consecutivos dejan los mismos conteos por entidad', async () => {
    await admin.agent.post('/api/v1/admin/seed/reset').send();
    const s1 = await admin.agent.get('/api/v1/admin/seed/status');
    await admin.agent.post('/api/v1/admin/seed/reset').send();
    const s2 = await admin.agent.get('/api/v1/admin/seed/status');
    expect(s2.body.data.recordCount).toEqual(s1.body.data.recordCount);
  }, 60_000);

  it('TS-04: GET /status refleja lastRunAt y recordCount tras el reset', async () => {
    const res = await admin.agent.get('/api/v1/admin/seed/status');
    expect(res.status).toBe(200);
    expect(res.body.data.lastRunAt).not.toBeNull();
    expect(res.body.data.recordCount.users).toBeGreaterThan(0);
  });

  it('NT-01: sin sesión → 401', async () => {
    const res = await request(app).post('/api/v1/admin/seed/reset').send();
    expect(res.status).toBe(401);
  });

  it('NT-02: rol organizer → 403', async () => {
    const org = await organizerAgent();
    const res = await org.post('/api/v1/admin/seed/reset').send();
    expect(res.status).toBe(403);
  });

  it('NT-04: body con campo desconocido → 400 (Zod strict)', async () => {
    const res = await admin.agent.post('/api/v1/admin/seed/reset').send({ unexpected: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('NT-03 / SEC-002: con SEED_DEMO_ENABLED=false la ruta no existe → 404 indistinguible', async () => {
    const prev = process.env.SEED_DEMO_ENABLED;
    process.env.SEED_DEMO_ENABLED = 'false';
    try {
      const appOff = createApp();
      const res = await request(appOff).post('/api/v1/admin/seed/reset').send();
      expect(res.status).toBe(404);
      // Idéntico a una ruta inexistente cualquiera (sin filtrar la existencia del endpoint).
      const ghost = await request(appOff).post('/api/v1/admin/seed/nonexistent-xyz').send();
      expect(ghost.status).toBe(404);
      expect(res.body.error?.code).toBe(ghost.body.error?.code);
    } finally {
      process.env.SEED_DEMO_ENABLED = prev;
    }
  });
});
