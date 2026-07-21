// US-080 (PB-P1-046) / QA-002 + QA-003 + QA-004 (parte runtime) — Integration/API tests contra
// Postgres real. Cubre (Tech Spec §13):
//   TS-01 listado sin filtros ⇒ 200 + items ordenados created_at DESC.
//   TS-02 filtros combinados (admin_id + target_type).
//   TS-03 paginación con cursor keyset.
//   TS-04 self-log evitado: COUNT(admin_actions) igual antes y después del GET.
//   TS-05 empty con filtros restrictivos.
//   NT-01 POST /admin/admin-actions ⇒ 404 (inmutabilidad).
//   NT-02 PATCH /admin/admin-actions/:id ⇒ 404.
//   NT-03 DELETE /admin/admin-actions/:id ⇒ 404.
//   NT-04 cursor malformado ⇒ 400 INVALID_CURSOR.
//   NT-05 created_at_from > created_at_to ⇒ 400 VALIDATION_ERROR.
//   AUTH-TS-02 organizer ⇒ 403; AUTH-TS-03 vendor ⇒ 403; AUTH-TS-04 sin sesión ⇒ 401.
//
// Los AdminAction fixture se insertan directamente vía Prisma (append-only via `create`) para
// no depender de la cadena completa de moderación US-067/US-047. La truncación inicial preserva
// la paridad con US-077 IT.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient, Prisma } from '@prisma/client';
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
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

type Agent = ReturnType<typeof request.agent>;

let adminAgent: Agent;
let organizerAgent: Agent;
let vendorAgent: Agent;
let adminUserAId = '';
let adminUserBId = '';
const targetReviewId = '11111111-1111-1111-1111-111111111111';
const targetVendorId = '22222222-2222-2222-2222-222222222222';

async function registerLogin(
  role: 'organizer' | 'vendor' | 'admin',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us080_${role}_${rnd()}@eventflow.test`;
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    ...(role === 'vendor' ? { businessName: 'Vendor Demo SA' } : { name: role }),
    role: role === 'admin' ? 'organizer' : role,
    captchaToken: CAPTCHA,
  });
  const userId = reg.body.data.id as string;
  if (role === 'admin') {
    await prisma.user.update({ where: { id: userId }, data: { role: 'admin' } });
  }
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return { agent, userId };
}

async function seedAction(
  adminUserId: string,
  action: string,
  targetEntity: string,
  targetId: string,
  metadata: Record<string, unknown> | null,
  createdAt: Date,
): Promise<string> {
  const jsonMetadata = (metadata ?? {}) as Prisma.InputJsonValue;
  const created = await prisma.adminAction.create({
    data: {
      adminUserId,
      action,
      targetEntity,
      targetId,
      metadata: jsonMetadata,
      createdAt,
    },
    select: { id: true },
  });
  return created.id;
}

describe.skipIf(!dbUp)('US-080 QA — Admin AdminAction list integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, notifications, booking_intents, quotes, quote_requests, budget_items, budgets, events, sessions, password_reset_tokens, admin_actions, users, event_types, locations, service_categories, vendor_profiles RESTART IDENTITY CASCADE`,
    );

    const adminA = await registerLogin('admin');
    adminUserAId = adminA.userId;
    adminAgent = adminA.agent;

    const adminB = await registerLogin('admin');
    adminUserBId = adminB.userId;

    const organizer = await registerLogin('organizer');
    organizerAgent = organizer.agent;

    const vendor = await registerLogin('vendor');
    vendorAgent = vendor.agent;

    // 5 AdminActions con timestamps controlados (evita colisión con actions generadas por
    // el registro/login que van al mismo bucket).
    const base = Date.parse('2026-06-01T00:00:00.000Z');
    await seedAction(adminUserAId, 'hide', 'review', targetReviewId, {
      reason: 'Inapropiado',
      from_status: 'published',
      to_status: 'hidden',
    }, new Date(base + 5 * 60_000));
    await seedAction(adminUserAId, 'approve', 'vendor_profile', targetVendorId, {
      from_status: 'pending',
      to_status: 'approved',
    }, new Date(base + 4 * 60_000));
    await seedAction(adminUserBId, 'reject', 'vendor_profile', targetVendorId, {
      reason: 'Docs incompletos',
    }, new Date(base + 3 * 60_000));
    await seedAction(adminUserBId, 'remove', 'review', targetReviewId, {
      reason: 'Reincidencia',
    }, new Date(base + 2 * 60_000));
    await seedAction(adminUserAId, 'approve', 'service_category', '33333333-3333-3333-3333-333333333333', null, new Date(base + 1 * 60_000));
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TS-01: sin filtros ⇒ 200 + items ordenados created_at DESC', async () => {
    const res = await adminAgent.get('/api/v1/admin/admin-actions');
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<{ created_at: string }>;
    expect(items.length).toBeGreaterThan(0);
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i - 1]!.created_at >= items[i]!.created_at).toBe(true);
    }
    expect(res.body.data.pagination.pageSize).toBe(25);
  });

  it('TS-02: filtro admin_id + target_type ⇒ items filtrados', async () => {
    const res = await adminAgent.get(
      `/api/v1/admin/admin-actions?admin_id=${encodeURIComponent(adminUserAId)}&target_type=review`,
    );
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<{
      admin: { id: string };
      target_type: string;
    }>;
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      expect(it.admin.id).toBe(adminUserAId);
      expect(it.target_type).toBe('review');
    }
  });

  it('AC-02: cada item incluye admin info (id + businessName + email) + payload', async () => {
    const res = await adminAgent.get(
      `/api/v1/admin/admin-actions?admin_id=${encodeURIComponent(adminUserAId)}&target_type=review`,
    );
    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<{
      admin: { id: string; businessName: string | null; email: string };
      payload: Record<string, unknown> | null;
      reason: string | null;
    }>;
    const first = items[0]!;
    expect(first.admin.id).toBe(adminUserAId);
    expect(first.admin.email).toContain('@');
    // El primer item ordenado por created_at DESC dentro del filtro es `hide` con reason + payload.
    expect(first.reason).toBe('Inapropiado');
    expect(first.payload).toEqual({ from_status: 'published', to_status: 'hidden' });
  });

  it('TS-03: paginación con cursor keyset', async () => {
    const first = await adminAgent.get('/api/v1/admin/admin-actions?pageSize=2');
    expect(first.status).toBe(200);
    expect(first.body.data.pagination.nextCursor).not.toBeNull();
    const cursor = first.body.data.pagination.nextCursor as string;
    const second = await adminAgent.get(
      `/api/v1/admin/admin-actions?pageSize=2&cursor=${encodeURIComponent(cursor)}`,
    );
    expect(second.status).toBe(200);
    const firstIds = (first.body.data.items as Array<{ id: string }>).map((r) => r.id);
    const secondIds = (second.body.data.items as Array<{ id: string }>).map((r) => r.id);
    for (const id of secondIds) expect(firstIds).not.toContain(id);
  });

  it('AC-04 / TS-04: self-log evitado — COUNT(admin_actions) sin cambio tras GET', async () => {
    const before = await prisma.adminAction.count();
    await adminAgent.get('/api/v1/admin/admin-actions');
    await adminAgent.get(`/api/v1/admin/admin-actions?admin_id=${adminUserAId}`);
    const after = await prisma.adminAction.count();
    expect(after).toBe(before);
  });

  it('TS-05: filtros restrictivos ⇒ empty', async () => {
    const res = await adminAgent.get(
      '/api/v1/admin/admin-actions?target_type=event&action=this_action_does_not_exist',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pagination.nextCursor).toBeNull();
  });

  // ── Inmutabilidad arquitectónica (AC-03) — QA-004 runtime ──────────────────
  it('NT-01: POST /admin/admin-actions ⇒ 404 (endpoint inexistente)', async () => {
    const res = await adminAgent.post('/api/v1/admin/admin-actions').send({});
    expect(res.status).toBe(404);
  });

  it('NT-02: PATCH /admin/admin-actions/:id ⇒ 404', async () => {
    const res = await adminAgent.patch('/api/v1/admin/admin-actions/anything').send({});
    expect(res.status).toBe(404);
  });

  it('NT-03: DELETE /admin/admin-actions/:id ⇒ 404', async () => {
    const res = await adminAgent.delete('/api/v1/admin/admin-actions/anything');
    expect(res.status).toBe(404);
  });

  // ── Validación (EC-02 · EC-04 · VR-05) ─────────────────────────────────────
  it('NT-04: cursor malformado ⇒ 400 INVALID_CURSOR', async () => {
    const res = await adminAgent.get('/api/v1/admin/admin-actions?cursor=%21%21%21bad%21%21%21');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('NT-05: created_at_from > created_at_to ⇒ 400 VALIDATION_ERROR', async () => {
    const res = await adminAgent.get(
      '/api/v1/admin/admin-actions?created_at_from=2026-08-01&created_at_to=2026-07-01',
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ── Authorization (AUTH-TS-01..04) ─────────────────────────────────────────
  it('AUTH-TS-02: organizer ⇒ 403', async () => {
    const res = await organizerAgent.get('/api/v1/admin/admin-actions');
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-03: vendor ⇒ 403', async () => {
    const res = await vendorAgent.get('/api/v1/admin/admin-actions');
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-04: sin sesión ⇒ 401', async () => {
    const res = await request(app).get('/api/v1/admin/admin-actions');
    expect(res.status).toBe(401);
  });
});
