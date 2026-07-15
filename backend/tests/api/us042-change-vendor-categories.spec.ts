// US-042 (PB-P1-025 / QA-002 + QA-003 + QA-004) — Tests HTTP end-to-end de
// `POST /api/v1/vendors/me/categories`.
// - DB-free: anónimo → 401; body inválido → 400 VALIDATION_ERROR o INVALID_CATEGORIES.
// - DB-gated (skipIf): AC-01..04 + EC-01..05 + AUTH-TS-01..05 + AdminAction insert.
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
  `us042_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function agentFor(role: 'organizer' | 'vendor'): Promise<ReturnType<typeof request.agent>> {
  const email = uniqEmail(role);
  const agent = request.agent(app);
  const payload: Record<string, unknown> = {
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role,
    captchaToken: CAPTCHA,
  };
  if (role === 'vendor') payload.businessName = 'Vendor Reg US042';
  else payload.name = 'Organizer';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

const VALID_UUID = '00000000-0000-0000-0000-000000000001';

describe('US-042 QA-002/003 (sin BD): auth y validación de body', () => {
  it('AUTH-TS-01: POST anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app)
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [VALID_UUID] });
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });
});

describe.skipIf(!dbUp)('US-042 QA-002/003/004 (con BD): flujo end-to-end', () => {
  let vendorApproved: ReturnType<typeof request.agent>;
  let vendorPending: ReturnType<typeof request.agent>;
  let vendorRejected: ReturnType<typeof request.agent>;
  let vendorHidden: ReturnType<typeof request.agent>;
  let vendorDeleted: ReturnType<typeof request.agent>;
  let vendorLimit: ReturnType<typeof request.agent>;
  let vendorNoProfile: ReturnType<typeof request.agent>;
  let organizerAgent: ReturnType<typeof request.agent>;

  let locationId = '';
  let cateringId = '';
  let venueId = '';
  let weddingId = '';
  let inactiveCategoryId = '';

  async function createProfileFor(
    agent: ReturnType<typeof request.agent>,
    categoryIds: string[] = [],
  ): Promise<string> {
    const res = await agent.post('/api/v1/vendors/me').send({
      business_name: `Vendor ${Math.floor(Math.random() * 1e6)}`,
      bio: 'Descripción de negocio para US-042 test con al menos cincuenta caracteres válidos.',
      location_id: locationId,
      languages_supported: ['es-LATAM'],
      categories: categoryIds.length > 0 ? categoryIds : [cateringId],
    });
    return res.body?.data?.id as string;
  }

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE admin_actions, vendor_profile_categories, vendor_profiles, sessions, password_reset_tokens, users RESTART IDENTITY CASCADE`,
    );
    locationId = (
      await prisma.location.create({ data: { country: 'GT', city: 'US042 City' } })
    ).id;
    cateringId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'catering' },
        update: { isActive: true, deletedAt: null },
        create: { code: 'catering', label: 'Catering', isActive: true, depthLevel: 1 },
      })
    ).id;
    venueId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'venue' },
        update: { isActive: true, deletedAt: null },
        create: { code: 'venue', label: 'Venue', isActive: true, depthLevel: 1 },
      })
    ).id;
    weddingId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'wedding' },
        update: { isActive: true, deletedAt: null },
        create: { code: 'wedding', label: 'Wedding', isActive: true, depthLevel: 1 },
      })
    ).id;
    inactiveCategoryId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'us042-inactive' },
        update: { isActive: false, deletedAt: null },
        create: { code: 'us042-inactive', label: 'Inactive', isActive: false, depthLevel: 1 },
      })
    ).id;

    // Vendors preparados con diferentes estados y contadores.
    vendorApproved = await agentFor('vendor');
    const approvedId = await createProfileFor(vendorApproved, [cateringId]);
    await prisma.vendorProfile.update({
      where: { id: approvedId },
      data: { status: 'approved' },
    });

    vendorPending = await agentFor('vendor');
    await createProfileFor(vendorPending, [cateringId]);
    // Se queda pending por default.

    vendorRejected = await agentFor('vendor');
    const rejectedId = await createProfileFor(vendorRejected, [cateringId]);
    await prisma.vendorProfile.update({
      where: { id: rejectedId },
      data: { status: 'rejected' },
    });

    vendorHidden = await agentFor('vendor');
    const hiddenId = await createProfileFor(vendorHidden, [cateringId]);
    await prisma.vendorProfile.update({
      where: { id: hiddenId },
      data: { status: 'hidden' },
    });

    vendorDeleted = await agentFor('vendor');
    const deletedProfileId = await createProfileFor(vendorDeleted, [cateringId]);
    const deletedUserId = (await vendorDeleted.get('/api/v1/users/me')).body?.data?.id as string;
    await prisma.vendorProfile.update({
      where: { id: deletedProfileId },
      data: { deletedAt: new Date(), deletedBy: deletedUserId },
    });

    vendorLimit = await agentFor('vendor');
    const limitId = await createProfileFor(vendorLimit, [cateringId]);
    await prisma.vendorProfile.update({
      where: { id: limitId },
      data: { status: 'approved', categoryChangeCount: 5, requiresAdminReview: true },
    });

    vendorNoProfile = await agentFor('vendor');
    organizerAgent = await agentFor('organizer');
  });

  it('AC-01: approved + diff → 200 repending=true, status=pending, AdminAction insert', async () => {
    const before = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId, weddingId] });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(true);
    expect(res.body?.data?.noop).toBe(false);
    expect(res.body?.data?.status).toBe('pending');
    expect(res.body?.data?.category_change_count).toBe(1);
    expect(res.body?.data?.requires_admin_review).toBe(true);
    expect(res.body?.data?.last_category_change_at).toBeTruthy();
    const after = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });
    expect(after - before).toBe(1);
    const record = await prisma.adminAction.findFirst({
      where: { action: 'vendor_category_change' },
      orderBy: { createdAt: 'desc' },
    });
    expect(record?.actorRole).toBe('vendor');
    expect(record?.targetEntity).toBe('VendorProfile');
    expect(record?.correlationId).toBeTruthy();
    // Restauramos approved para tests siguientes con el mismo vendor.
    const userId = (await vendorApproved.get('/api/v1/users/me')).body?.data?.id as string;
    await prisma.vendorProfile.updateMany({
      where: { userId },
      data: { status: 'approved' },
    });
  });

  it('EC-01: noop cuando el set enviado es idéntico → 200 noop=true, sin AdminAction extra', async () => {
    const currentUserId = (await vendorApproved.get('/api/v1/users/me')).body?.data?.id as string;
    const profile = await prisma.vendorProfile.findFirst({
      where: { userId: currentUserId },
      include: { categories: true },
    });
    const currentIds = profile!.categories.map((c) => c.serviceCategoryId);
    const before = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });

    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [...currentIds].reverse() });
    expect(res.status).toBe(200);
    expect(res.body?.data?.noop).toBe(true);
    expect(res.body?.data?.repending).toBe(false);
    const after = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });
    expect(after - before).toBe(0);
  });

  it('AC-03: pending + diff → 200 sin transición (sigue pending), AdminAction insert', async () => {
    const before = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });
    const res = await vendorPending
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId] });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(false);
    expect(res.body?.data?.status).toBe('pending');
    const after = await prisma.adminAction.count({
      where: { action: 'vendor_category_change' },
    });
    expect(after - before).toBe(1);
  });

  it('AC-04: rejected + diff → 200 repending=true, status transiciona a pending', async () => {
    const res = await vendorRejected
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId] });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(true);
    expect(res.body?.data?.status).toBe('pending');
  });

  it('EC-02 / AUTH-TS-04: hidden → 409 PROFILE_HIDDEN', async () => {
    const res = await vendorHidden
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId] });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  it('EC-03 / AUTH-TS-05: soft-deleted → 404 PROFILE_NOT_FOUND', async () => {
    const res = await vendorDeleted
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId] });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('PROFILE_NOT_FOUND');
  });

  it('AC-02: contador >= 5 → 409 CATEGORY_CHANGE_LIMIT', async () => {
    const res = await vendorLimit
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [venueId] });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('CATEGORY_CHANGE_LIMIT');
  });

  it('EC-04: array vacío → 400 VALIDATION_ERROR', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [] });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('EC-04: duplicados → 400', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [cateringId, cateringId] });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('EC-04: más de 5 → 400', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({
        service_category_ids: [
          cateringId,
          venueId,
          weddingId,
          '00000000-0000-0000-0000-000000000011',
          '00000000-0000-0000-0000-000000000012',
          '00000000-0000-0000-0000-000000000013',
        ],
      });
    expect(res.status).toBe(400);
  });

  it('EC-05: categoría inactiva → 400 INVALID_CATEGORY con details.field=service_category_ids', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [inactiveCategoryId] });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CATEGORY');
    expect(res.body?.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'service_category_ids' })]),
    );
  });

  it('EC-05: categoría inexistente → 400 INVALID_CATEGORY', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: ['00000000-0000-0000-0000-000000000fff'] });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CATEGORY');
  });

  it('AUTH-TS-02: vendor sin perfil → 404 PROFILE_NOT_FOUND', async () => {
    const res = await vendorNoProfile
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [cateringId] });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('PROFILE_NOT_FOUND');
  });

  it('AUTH-TS-03: organizer → 403', async () => {
    const res = await organizerAgent
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: [cateringId] });
    expect(res.status).toBe(403);
  });

  it('NT: last_category_change_at solo se setea en mutaciones reales (no en noop)', async () => {
    const currentUserId = (await vendorApproved.get('/api/v1/users/me')).body?.data?.id as string;
    const before = await prisma.vendorProfile.findFirst({
      where: { userId: currentUserId },
      select: { lastCategoryChangeAt: true, categories: { select: { serviceCategoryId: true } } },
    });
    const currentIds = before!.categories.map((c) => c.serviceCategoryId);
    const beforeTs = before!.lastCategoryChangeAt;

    // Noop: mismo set → no debería tocar el timestamp.
    await vendorApproved
      .post('/api/v1/vendors/me/categories')
      .send({ service_category_ids: currentIds });
    const afterNoop = await prisma.vendorProfile.findFirst({
      where: { userId: currentUserId },
      select: { lastCategoryChangeAt: true },
    });
    expect(afterNoop!.lastCategoryChangeAt?.toISOString()).toBe(beforeTs?.toISOString());
  });
});
