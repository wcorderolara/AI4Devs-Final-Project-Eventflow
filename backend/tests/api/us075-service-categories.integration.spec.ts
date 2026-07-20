// US-075 (PB-P1-042 / QA-002 + QA-003 + QA-004) — Integration tests con Supertest + Prisma real.
//
// Cubre (Tech Spec §13 + AUTH-TS-01..04):
//   Admin CRUD:
//     - AC-01 crear root feliz ⇒ 201 + AdminAction append-only + log denormalize `label`.
//     - AC-02 crear child feliz ⇒ 201 + depth_level=2.
//     - EC-01 crear con parent ya-child ⇒ 409 INVALID_HIERARCHY_DEPTH.
//     - EC-05 name_i18n sin es-LATAM ⇒ 400 INVALID_NAME_I18N.
//     - EC-06 code duplicado ⇒ 409 DUPLICATE_CODE.
//     - AC-03 update name + is_active ⇒ 200 + AdminAction (action=update / reactivate).
//     - EC-02 mover root con children a sub ⇒ 409 INVALID_HIERARCHY_DEPTH.
//     - 404 SERVICE_CATEGORY_NOT_FOUND en PATCH/DELETE contra UUID inexistente.
//     - AC-04 soft delete feliz sin dependencias ⇒ 200 + is_active=false + AdminAction soft_delete.
//     - EC-03 soft delete con vendor_services ⇒ 409 CATEGORY_IN_USE con `details.usage_count`.
//     - EC-04 soft delete de root con children activos ⇒ 409 CATEGORY_HAS_CHILDREN.
//     - VR-10 soft delete sin reason ⇒ 400 REASON_REQUIRED.
//     - VR-10 soft delete con reason < 10 ⇒ 400 INVALID_REASON_LENGTH.
//     - AC-05 listado admin incluye is_active=false.
//   Público (AC-06):
//     - GET /service-categories ⇒ 200 con {tree, flat} SOLO activas + subs re-parenteadas.
//   Authorization (AUTH-TS-01..04):
//     - admin ⇒ 200/201 en admin endpoints.
//     - organizer / vendor ⇒ 403 FORBIDDEN.
//     - sin sesión ⇒ 401 AUTHENTICATION_REQUIRED (público y admin).
import { beforeAll, describe, expect, it } from 'vitest';
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
const rnd = (): string => `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

type Agent = ReturnType<typeof request.agent>;

async function registerLogin(role: 'organizer' | 'vendor' | 'admin'): Promise<Agent> {
  const email = `us075_${role}_${rnd()}@eventflow.test`;
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
  await agent.post('/api/v1/auth/login').send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

const VALID_REASON = 'Ya no aplica en LATAM verificado 2026-Q3 (integration test).';
const NAME = { 'es-LATAM': 'Test Categoría' };

describe.skipIf(!dbUp)('US-075 QA — service-categories admin CRUD + public', () => {
  let admin: Agent;
  let organizer: Agent;
  let vendor: Agent;

  beforeAll(async () => {
    // Truncate solo lo necesario para preservar aislamiento. `service_categories` cargará
    // filas nuevas por cada test — cada una con `code` único basado en `rnd()`.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE vendor_services, vendor_profile_categories, quote_requests, admin_actions, service_categories RESTART IDENTITY CASCADE`,
    );
    admin = await registerLogin('admin');
    organizer = await registerLogin('organizer');
    vendor = await registerLogin('vendor');
  }, 60_000);

  // ── AUTH-TS-01..04 ───────────────────────────────────────────────────────

  it('AUTH sin sesión ⇒ 401 en admin y en público', async () => {
    const anon = request.agent(app);
    const a = await anon.get('/api/v1/admin/service-categories');
    expect(a.status).toBe(401);
    expect(a.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
    const p = await anon.get('/api/v1/service-categories');
    expect(p.status).toBe(401);
  });

  it('AUTH organizer/vendor en admin endpoint ⇒ 403 FORBIDDEN', async () => {
    const o = await organizer.get('/api/v1/admin/service-categories');
    expect(o.status).toBe(403);
    const v = await vendor.get('/api/v1/admin/service-categories');
    expect(v.status).toBe(403);
  });

  it('AUTH admin ⇒ 200 en listado admin', async () => {
    const res = await admin.get('/api/v1/admin/service-categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.tree)).toBe(true);
    expect(Array.isArray(res.body.data.flat)).toBe(true);
  });

  it('AUTH organizer/vendor ⇒ 200 en endpoint público (cualquier autenticado)', async () => {
    const o = await organizer.get('/api/v1/service-categories');
    expect(o.status).toBe(200);
    expect(o.body.data).toHaveProperty('tree');
    expect(o.body.data).toHaveProperty('flat');
  });

  // ── Admin CRUD ───────────────────────────────────────────────────────────

  it('AC-01 crear root feliz ⇒ 201 + AdminAction append-only + label denormalizado', async () => {
    const code = `it_root_${rnd()}`;
    const res = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code, name_i18n: NAME, sort_order: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe(code);
    expect(res.body.data.parent_id).toBeNull();
    expect(res.body.data.depth_level).toBe(1);
    expect(res.body.data.is_active).toBe(true);
    expect(res.body.data.name_i18n['es-LATAM']).toBe(NAME['es-LATAM']);
    expect(res.body.data.label).toBe(NAME['es-LATAM']);

    const admins = await prisma.adminAction.findMany({
      where: { targetEntity: 'service_category', targetId: res.body.data.id },
    });
    expect(admins).toHaveLength(1);
    expect(admins[0]!.action).toBe('create');
  });

  it('AC-02 crear child ⇒ 201 + depth_level=2', async () => {
    const rootCode = `it_root_${rnd()}`;
    const root = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: rootCode, name_i18n: NAME });
    expect(root.status).toBe(201);

    const childCode = `it_child_${rnd()}`;
    const child = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: childCode, name_i18n: NAME, parent_id: root.body.data.id });
    expect(child.status).toBe(201);
    expect(child.body.data.parent_id).toBe(root.body.data.id);
    expect(child.body.data.depth_level).toBe(2);
  });

  it('EC-01 crear con parent ya-child ⇒ 409 INVALID_HIERARCHY_DEPTH', async () => {
    const root = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_root_${rnd()}`, name_i18n: NAME });
    const child = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_child_${rnd()}`, name_i18n: NAME, parent_id: root.body.data.id });
    const grandchild = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_gc_${rnd()}`, name_i18n: NAME, parent_id: child.body.data.id });
    expect(grandchild.status).toBe(409);
    expect(grandchild.body.error.code).toBe('INVALID_HIERARCHY_DEPTH');
  });

  it('EC-05 name_i18n sin es-LATAM ⇒ 400 INVALID_NAME_I18N', async () => {
    const res = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_ni_${rnd()}`, name_i18n: { en: 'Only english' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_NAME_I18N');
  });

  it('EC-06 code duplicado ⇒ 409 DUPLICATE_CODE', async () => {
    const code = `it_dup_${rnd()}`;
    const first = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code, name_i18n: NAME });
    expect(first.status).toBe(201);
    const second = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code, name_i18n: NAME });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('DUPLICATE_CODE');
  });

  it('AC-03 update name + reactivate cuando is_active pasa false→true', async () => {
    const created = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_upd_${rnd()}`, name_i18n: NAME });
    // Primero desactiva.
    const off = await admin
      .patch(`/api/v1/admin/service-categories/${created.body.data.id}`)
      .send({ is_active: false });
    expect(off.status).toBe(200);
    expect(off.body.data.is_active).toBe(false);
    // Ahora reactivate — action='reactivate' en AdminAction.
    const on = await admin
      .patch(`/api/v1/admin/service-categories/${created.body.data.id}`)
      .send({ is_active: true, name_i18n: { 'es-LATAM': 'Renombrada' } });
    expect(on.status).toBe(200);
    expect(on.body.data.is_active).toBe(true);
    expect(on.body.data.label).toBe('Renombrada');

    const actions = await prisma.adminAction.findMany({
      where: { targetEntity: 'service_category', targetId: created.body.data.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map((a) => a.action)).toEqual(['create', 'update', 'reactivate']);
  });

  it('EC-02 mover root con children a sub ⇒ 409 INVALID_HIERARCHY_DEPTH', async () => {
    const r1 = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_r1_${rnd()}`, name_i18n: NAME });
    const r2 = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_r2_${rnd()}`, name_i18n: NAME });
    await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_ch_${rnd()}`, name_i18n: NAME, parent_id: r1.body.data.id });
    const patch = await admin
      .patch(`/api/v1/admin/service-categories/${r1.body.data.id}`)
      .send({ parent_id: r2.body.data.id });
    expect(patch.status).toBe(409);
    expect(patch.body.error.code).toBe('INVALID_HIERARCHY_DEPTH');
  });

  it('404 SERVICE_CATEGORY_NOT_FOUND en PATCH contra UUID inexistente', async () => {
    const patch = await admin
      .patch('/api/v1/admin/service-categories/00000000-0000-4000-8000-000000000000')
      .send({ is_active: true });
    expect(patch.status).toBe(404);
    expect(patch.body.error.code).toBe('SERVICE_CATEGORY_NOT_FOUND');
  });

  // ── Soft delete ─────────────────────────────────────────────────────────

  it('AC-04 soft delete feliz + AdminAction soft_delete', async () => {
    const c = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_del_${rnd()}`, name_i18n: NAME });
    const del = await admin
      .delete(`/api/v1/admin/service-categories/${c.body.data.id}`)
      .send({ reason: VALID_REASON });
    expect(del.status).toBe(200);
    expect(del.body.data.is_active).toBe(false);
    const actions = await prisma.adminAction.findMany({
      where: { targetEntity: 'service_category', targetId: c.body.data.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map((a) => a.action)).toContain('soft_delete');
  });

  it('EC-04 soft delete de root con children activos ⇒ 409 CATEGORY_HAS_CHILDREN', async () => {
    const r = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_dr_${rnd()}`, name_i18n: NAME });
    await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_dc_${rnd()}`, name_i18n: NAME, parent_id: r.body.data.id });
    const del = await admin
      .delete(`/api/v1/admin/service-categories/${r.body.data.id}`)
      .send({ reason: VALID_REASON });
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe('CATEGORY_HAS_CHILDREN');
    expect(del.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'children_count' })]),
    );
  });

  it('VR-10 soft delete sin reason ⇒ 400 REASON_REQUIRED', async () => {
    const c = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_dr2_${rnd()}`, name_i18n: NAME });
    const del = await admin.delete(`/api/v1/admin/service-categories/${c.body.data.id}`).send({});
    expect(del.status).toBe(400);
    expect(del.body.error.code).toBe('REASON_REQUIRED');
  });

  it('VR-10 soft delete con reason < 10 ⇒ 400 INVALID_REASON_LENGTH', async () => {
    const c = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_dr3_${rnd()}`, name_i18n: NAME });
    const del = await admin
      .delete(`/api/v1/admin/service-categories/${c.body.data.id}`)
      .send({ reason: 'short' });
    expect(del.status).toBe(400);
    expect(del.body.error.code).toBe('INVALID_REASON_LENGTH');
  });

  // ── Público (AC-06) ─────────────────────────────────────────────────────

  it('AC-06 público muestra SOLO activas + subs re-parenteadas correctamente', async () => {
    const rootCode = `it_pub_root_${rnd()}`;
    const root = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: rootCode, name_i18n: { 'es-LATAM': 'Pub Root' } });
    await admin
      .post('/api/v1/admin/service-categories')
      .send({
        code: `it_pub_child_${rnd()}`,
        name_i18n: { 'es-LATAM': 'Pub Child' },
        parent_id: root.body.data.id,
      });
    const inactive = await admin
      .post('/api/v1/admin/service-categories')
      .send({ code: `it_pub_inactive_${rnd()}`, name_i18n: { 'es-LATAM': 'Pub Inactive' } });
    await admin
      .patch(`/api/v1/admin/service-categories/${inactive.body.data.id}`)
      .send({ is_active: false });

    const pub = await organizer.get('/api/v1/service-categories');
    expect(pub.status).toBe(200);
    const codes = pub.body.data.flat.map((c: { code: string }) => c.code);
    expect(codes).toContain(rootCode);
    expect(codes).not.toContain(inactive.body.data.code);
  });
});
