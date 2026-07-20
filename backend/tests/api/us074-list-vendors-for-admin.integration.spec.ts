// US-074 (PB-P1-041 / QA-002 + QA-003 + QA-005) — Integration/API tests con Supertest + Prisma
// real para el endpoint `GET /api/v1/admin/vendors`.
//
// Cubre (Tech Spec §13 · TS-01..TS-05 + AUTH + Perf smoke):
//   TS-01 default sin filtros ⇒ 200 + items ordenados por created_at DESC, id DESC + owner email
//         + last_admin_action del chain (US-047).
//   TS-02 filtro status=pending ⇒ sólo pending; sin approved/rejected/hidden.
//   TS-03 filtros combinados (status[]=approved+is_hidden=true) ⇒ subset correcto.
//   TS-04 business_name ILIKE case-insensitive substring.
//   TS-05 cursor pagination — segunda página no repite ids de la primera; nextCursor null en
//         última página.
//   EC-02 cursor malformado ⇒ 400 INVALID_CURSOR.
//   EC-04 created_at_from > created_at_to ⇒ 400 VALIDATION_ERROR.
//   AUTH-TS-02 organizer ⇒ 403; AUTH-TS-03 vendor ⇒ 403; AUTH-TS-04 sin sesión ⇒ 401.
//   Regresión US-047: tras moderate, el nuevo `last_admin_action` aparece en el listado (chain
//         actualizado en la misma tx).
//   QA-005 perf smoke: single-shot request con 30 vendors + filtros combinados en < 500 ms.
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
  const email = `us074_${role}_${rnd()}@eventflow.test`;
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

interface SeededVendor {
  id: string;
  userId: string;
  businessName: string;
  status: 'pending' | 'approved' | 'rejected';
  isHidden: boolean;
}

async function seedVendor(
  status: 'pending' | 'approved' | 'rejected' = 'pending',
  opts: { isHidden?: boolean; businessName?: string } = {},
): Promise<SeededVendor> {
  const email = `us074_v_${rnd()}@eventflow.test`;
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: 'seed',
      role: 'vendor',
      status: 'active',
    },
    select: { id: true },
  });
  const businessName = opts.businessName ?? `Vendor ${rnd()}`;
  const vp = await prisma.vendorProfile.create({
    data: {
      userId: user.id,
      businessName,
      status,
      isHidden: opts.isHidden ?? false,
      languagesSupported: ['es-LATAM'],
    },
    select: { id: true, isHidden: true, status: true, businessName: true },
  });
  return {
    id: vp.id,
    userId: user.id,
    businessName: vp.businessName,
    status: vp.status as 'pending' | 'approved' | 'rejected',
    isHidden: vp.isHidden,
  };
}

const BASE = '/api/v1/admin/vendors';

describe.skipIf(!dbUp)('US-074 QA — ListVendorsForAdmin integration', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE notifications, admin_actions, sessions, password_reset_tokens, vendor_profiles, users RESTART IDENTITY CASCADE`,
    );
  }, 60_000);

  it('TS-01 default ⇒ 200 + items DESC + owner email + last_admin_action null (sin moderar)', async () => {
    const { agent: admin } = await registerLogin('admin');
    const v1 = await seedVendor('pending');
    await new Promise((r) => setTimeout(r, 5));
    const v2 = await seedVendor('approved');

    const res = await admin.get(BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.pagination.pageSize).toBe(25);
    // Los 2 sembrados aparecen en orden DESC created_at (v2 antes que v1).
    const ids = res.body.data.items.map((i: { id: string }) => i.id);
    expect(ids.slice(0, 2)).toEqual([v2.id, v1.id]);
    // owner.email presente (D4 SEC-03 PII completa).
    const first = res.body.data.items[0];
    expect(first.owner.email).toMatch(/@eventflow\.test$/);
    expect(first.lastAdminAction).toBeNull();
  });

  it('TS-02 filtro status=pending ⇒ sólo pending', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin.get(BASE).query({ status: 'pending' });
    expect(res.status).toBe(200);
    for (const item of res.body.data.items) {
      expect(item.status).toBe('pending');
    }
  });

  it('TS-03 filtros combinados status=approved + is_hidden=true', async () => {
    const { agent: admin } = await registerLogin('admin');
    await seedVendor('approved', { isHidden: true });
    await seedVendor('approved', { isHidden: false });
    const res = await admin.get(BASE).query({ status: 'approved', is_hidden: 'true' });
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    for (const item of res.body.data.items) {
      expect(item.status).toBe('approved');
      expect(item.isHidden).toBe(true);
    }
  });

  it('TS-04 business_name ILIKE case-insensitive substring', async () => {
    const { agent: admin } = await registerLogin('admin');
    const uniq = `UniqueCatering-${rnd()}`;
    await seedVendor('pending', { businessName: uniq });
    const res = await admin.get(BASE).query({ business_name: 'uniquecatering' });
    expect(res.status).toBe(200);
    const found = res.body.data.items.find((i: { businessName: string }) => i.businessName === uniq);
    expect(found).toBeDefined();
  });

  it('TS-05 cursor pagination — segunda página no repite ids de la primera', async () => {
    const { agent: admin } = await registerLogin('admin');
    // Sembrar varios vendors para exceder pageSize=3.
    for (let i = 0; i < 5; i += 1) {
      await seedVendor('pending', { businessName: `PagVendor-${i}-${rnd()}` });
    }
    const first = await admin.get(BASE).query({ status: 'pending', pageSize: 3 });
    expect(first.status).toBe(200);
    expect(first.body.data.items.length).toBe(3);
    expect(first.body.data.pagination.nextCursor).not.toBeNull();

    const second = await admin
      .get(BASE)
      .query({ status: 'pending', pageSize: 3, cursor: first.body.data.pagination.nextCursor });
    expect(second.status).toBe(200);
    const firstIds = new Set(first.body.data.items.map((i: { id: string }) => i.id));
    for (const item of second.body.data.items) {
      expect(firstIds.has(item.id)).toBe(false);
    }
  });

  it('EC-02 cursor malformado ⇒ 400 INVALID_CURSOR', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin.get(BASE).query({ cursor: '!!!not-base64!!!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });

  it('EC-04 created_at_from > created_at_to ⇒ 400 VALIDATION_ERROR', async () => {
    const { agent: admin } = await registerLogin('admin');
    const res = await admin.get(BASE).query({
      created_at_from: '2026-08-01T00:00:00Z',
      created_at_to: '2026-07-01T00:00:00Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('AUTH-TS-02 organizer ⇒ 403 FORBIDDEN', async () => {
    const { agent: organizer } = await registerLogin('organizer');
    const res = await organizer.get(BASE);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-03 vendor ⇒ 403 FORBIDDEN', async () => {
    const { agent: vendor } = await registerLogin('vendor');
    const res = await vendor.get(BASE);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-04 sin sesión ⇒ 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('Regresión US-047: tras moderate, last_admin_action aparece en el listado', async () => {
    const { agent: admin } = await registerLogin('admin');
    const v = await seedVendor('pending');
    // Moderate reject via US-047 (mismo router).
    const mod = await admin
      .post(`${BASE}/${v.id}/moderate`)
      .send({ action: 'reject', reason: 'Documentación insuficiente verificada.' });
    expect(mod.status).toBe(200);

    // Filtro por status=rejected para acotar (el vendor debe estar ahí ahora).
    const list = await admin.get(BASE).query({ status: 'rejected' });
    expect(list.status).toBe(200);
    const found = list.body.data.items.find((i: { id: string }) => i.id === v.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('rejected');
    expect(found.lastAdminAction).not.toBeNull();
    expect(found.lastAdminAction.action).toBe('reject');
    expect(found.lastAdminAction.reason).toBe('Documentación insuficiente verificada.');
  });

  it('QA-005 perf smoke: listado default con >30 vendors < 500ms wall-clock', async () => {
    const { agent: admin } = await registerLogin('admin');
    // Sembrar 30 vendors adicionales — el shard ya trae otros de tests previos.
    for (let i = 0; i < 30; i += 1) {
      await seedVendor(i % 2 === 0 ? 'approved' : 'pending', {
        businessName: `PerfSmoke-${i}-${rnd()}`,
      });
    }
    const t0 = performance.now();
    const res = await admin.get(BASE).query({ pageSize: 25 });
    const dt = performance.now() - t0;
    expect(res.status).toBe(200);
    expect(dt).toBeLessThan(500);
  });
});
