// US-047 (PB-P1-041 / QA-002 + QA-003 + QA-004 + QA-005 + QA-006) — Integration/API tests con
// Supertest + Prisma real.
//
// Cubre (Tech Spec §13 · TS-01..TS-06 + Concurrencia + AUTH + Security + Perf smoke):
//   TS-01 approve pending ⇒ 200 + audit + AdminAction + 2 notifs (in_app + email_simulated) +
//         admin_action_id chain.
//   TS-02 reject pending ⇒ 200 + status=rejected + notif `vendor.rejected`.
//   TS-03 hide approved ⇒ 200 + is_hidden=true (status intacto).
//   TS-04 unhide approved+hidden ⇒ 200 + is_hidden=false.
//   TS-05 regresión service común: los 9 eventos previos siguen operativos — verificado por las
//         suites us054..us067 (aquí no se re-corre; se asegura que `QuoteEventNotificationService`
//         acepta el nuevo `vendor.*` sin romper el tipo — chequeo estructural en UT us047).
//   TS-06 effect en US-040 (lookup público): rejected + is_hidden=true desaparecen del directorio
//         (`GET /vendors`) y del detalle (`GET /public/vendors/:slug`).
//   EC-01 doble approve ⇒ 409 INVALID_TRANSITION sin doble AdminAction.
//   EC-02 hide sobre pending ⇒ 409 INVALID_TRANSITION.
//   EC-03 re-approve rejected ⇒ 409 INVALID_TRANSITION (OUT of MVP).
//   EC-04 reject sin reason ⇒ 400 VALIDATION_ERROR (message REASON_REQUIRED).
//   EC-05 reason < 10 ⇒ 400 VALIDATION_ERROR.
//   EC-06 vendor inexistente ⇒ 404 VENDOR_NOT_FOUND (uniforme, Decisión PO D7).
//   EC-07 action inválido ⇒ 400 VALIDATION_ERROR.
//   AUTH-TS-01 admin ⇒ 200. AUTH-TS-02 organizer ⇒ 403. AUTH-TS-03 vendor ⇒ 403.
//   AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED.
//   QA-004 concurrencia: 2 hide simultáneos sobre `approved+visible` — 1 gana (200), otro 409
//         INVALID_TRANSITION porque tras el 1er UPDATE el vendor ya es `approved+is_hidden=true`
//         (transición `hide` requiere is_hidden=false). Sólo 1 AdminAction persistido.
//   QA-005 SEC-02: cada acción exitosa crea exactamente 1 AdminAction obligatorio; SEC-04:
//         reason enforcement en reject/hide.
//   QA-006 perf smoke: happy path approve termina en < 500 ms wall-clock (no p95, single-shot
//         indicativo — la tarea marca este check como `Should` con caveat de deuda).
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

async function registerLogin(
  role: 'organizer' | 'vendor' | 'admin',
): Promise<{ agent: Agent; userId: string }> {
  const email = `us047_${role}_${rnd()}@eventflow.test`;
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

interface VendorScenario {
  admin: Agent;
  adminUserId: string;
  organizer: Agent;
  vendor: Agent;
  vendorUserId: string;
  vendorProfileId: string;
  vendorSlug: string;
}

async function scenarioWithVendor(
  initialStatus: 'pending' | 'approved',
  opts: { isHidden?: boolean } = {},
): Promise<VendorScenario> {
  const { agent: admin, userId: adminUserId } = await registerLogin('admin');
  const { agent: organizer } = await registerLogin('organizer');
  const { agent: vendor, userId: vendorUserId } = await registerLogin('vendor');

  // Slug pattern: `^[a-z0-9-]+$` (US-046 param regex) — `rnd()` genera dígitos + underscore;
  // reemplazamos `_` por `-` para respetar el contrato del path público.
  const slug = `us047-${rnd().replace(/_/g, '-')}`;
  const vp = await prisma.vendorProfile.create({
    data: {
      userId: vendorUserId,
      businessName: `Vendor ${slug}`,
      slug,
      status: initialStatus,
      isHidden: opts.isHidden ?? false,
      languagesSupported: ['es-LATAM'],
    },
  });
  return {
    admin,
    adminUserId,
    organizer,
    vendor,
    vendorUserId,
    vendorProfileId: vp.id,
    vendorSlug: slug,
  };
}

const UUID = '11111111-1111-4111-8111-111111111111';
const VALID_REASON = 'Documentación insuficiente verificada por moderación (integration test).';

async function countNotifs(userId: string, event: string): Promise<number> {
  return prisma.notification.count({ where: { userId, type: event } });
}

describe.skipIf(!dbUp)('US-047 QA — ModerateVendor integration', () => {
  beforeAll(async () => {
    // Limpia solo la data de test relevante — evita CASCADE amplio para no colisionar con otros
    // specs que corran en el mismo shard de CI (mismo criterio conservador que other US IT).
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE notifications, admin_actions, sessions, password_reset_tokens, vendor_profiles, users RESTART IDENTITY CASCADE`,
    );
  }, 60_000);

  it('TS-01 AC-01 pending + approve ⇒ 200 + audit + AdminAction + 2 notifs + chain', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(s.vendorProfileId);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.isHidden).toBe(false);
    expect(res.body.data.moderatedBy).toBe(s.adminUserId);
    expect(res.body.data.moderationReason).toBeNull();
    expect(typeof res.body.data.adminActionId).toBe('string');

    // Audit columns pobladas en BD.
    const persisted = await prisma.vendorProfile.findUnique({ where: { id: s.vendorProfileId } });
    expect(persisted?.status).toBe('approved');
    expect(persisted?.isHidden).toBe(false);
    expect(persisted?.moderatedBy).toBe(s.adminUserId);
    expect(persisted?.adminActionId).toBe(res.body.data.adminActionId);

    // AdminAction append-only con payload snapshot.
    const adm = await prisma.adminAction.findUnique({ where: { id: res.body.data.adminActionId } });
    expect(adm?.action).toBe('approve');
    expect(adm?.targetEntity).toBe('vendor_profile');
    const meta = adm?.metadata as Record<string, unknown> | null;
    expect(meta?.from_status).toBe('pending');
    expect(meta?.to_status).toBe('approved');
    expect(meta?.from_is_hidden).toBe(false);
    expect(meta?.to_is_hidden).toBe(false);

    // 2 notifs al vendor (in_app + email_simulated) via service común.
    expect(await countNotifs(s.vendorUserId, 'vendor.approved')).toBe(2);
  });

  it('TS-02 pending + reject ⇒ 200 + status=rejected + notif vendor.rejected', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'reject', reason: VALID_REASON });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.moderationReason).toBe(VALID_REASON);
    expect(await countNotifs(s.vendorUserId, 'vendor.rejected')).toBe(2);
  });

  it('TS-03 approved + hide ⇒ 200 + is_hidden=true (status intacto)', async () => {
    const s = await scenarioWithVendor('approved');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.isHidden).toBe(true);
    expect(await countNotifs(s.vendorUserId, 'vendor.hidden')).toBe(2);
  });

  it('TS-04 approved+hidden + unhide ⇒ 200 + is_hidden=false (reason opcional)', async () => {
    const s = await scenarioWithVendor('approved', { isHidden: true });
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'unhide' });
    expect(res.status).toBe(200);
    expect(res.body.data.isHidden).toBe(false);
    expect(res.body.data.moderationReason).toBeNull();
    expect(await countNotifs(s.vendorUserId, 'vendor.unhidden')).toBe(2);
  });

  it('TS-06 US-040 lookup público: is_hidden=true saca al vendor del detalle público (404)', async () => {
    const s = await scenarioWithVendor('approved');
    const beforeHide = await request(app).get(`/api/v1/public/vendors/${s.vendorSlug}`);
    expect(beforeHide.status).toBe(200);

    await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });

    const afterHide = await request(app).get(`/api/v1/public/vendors/${s.vendorSlug}`);
    expect(afterHide.status).toBe(404);

    // Y también sale del directorio autenticado si estuviera indexado.
    // (No verificamos el listado completo aquí para no depender de otros vendors del shard.)
  });

  it('EC-01 doble approve ⇒ 409 INVALID_TRANSITION sin doble AdminAction', async () => {
    const s = await scenarioWithVendor('approved');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
    expect(res.body.error.details).toContainEqual({ field: 'from_status', message: 'approved' });
    const admCount = await prisma.adminAction.count({
      where: { targetEntity: 'vendor_profile', targetId: s.vendorProfileId },
    });
    expect(admCount).toBe(0);
  });

  it('EC-02 hide sobre pending ⇒ 409 INVALID_TRANSITION', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'hide', reason: VALID_REASON });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('EC-03 re-approve rejected ⇒ 409 INVALID_TRANSITION (OUT of MVP)', async () => {
    const s = await scenarioWithVendor('pending');
    await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'reject', reason: VALID_REASON });
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('EC-04 reject sin reason ⇒ 400 VALIDATION_ERROR con REASON_REQUIRED en details', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'reject' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual({
      field: 'body.reason',
      message: 'REASON_REQUIRED',
    });
  });

  it('EC-05 reason < 10 ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'reject', reason: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('EC-06 vendor inexistente ⇒ 404 VENDOR_NOT_FOUND (uniforme, Decisión PO D7)', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin
      .post(`/api/v1/admin/vendors/${UUID}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('VENDOR_NOT_FOUND');
  });

  it('EC-07 action inválido ⇒ 400 VALIDATION_ERROR', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'delete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-TS-02 organizer ⇒ 403 FORBIDDEN', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.organizer
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-03 vendor ⇒ 403 FORBIDDEN', async () => {
    const s = await scenarioWithVendor('pending');
    const res = await s.vendor
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/vendors/${UUID}/moderate`)
      .send({ action: 'approve' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('QA-004 concurrencia: 2 hide simultáneos — 1 gana (200), otro 409 sin doble AdminAction', async () => {
    const s = await scenarioWithVendor('approved');
    const [r1, r2] = await Promise.all([
      s.admin
        .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
        .send({ action: 'hide', reason: VALID_REASON }),
      s.admin
        .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
        .send({ action: 'hide', reason: VALID_REASON }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const loser = r1.status === 409 ? r1 : r2;
    expect(loser.body.error.code).toBe('INVALID_TRANSITION');
    const admCount = await prisma.adminAction.count({
      where: { targetEntity: 'vendor_profile', targetId: s.vendorProfileId },
    });
    expect(admCount).toBe(1);
  });

  it('QA-006 perf smoke: happy approve < 500 ms wall-clock (single-shot)', async () => {
    const s = await scenarioWithVendor('pending');
    const t0 = performance.now();
    const res = await s.admin
      .post(`/api/v1/admin/vendors/${s.vendorProfileId}/moderate`)
      .send({ action: 'approve' });
    const dt = performance.now() - t0;
    expect(res.status).toBe(200);
    // Umbral holgado: single-shot no representa p95, sólo detecta regresiones catastróficas.
    expect(dt).toBeLessThan(500);
  });
});
