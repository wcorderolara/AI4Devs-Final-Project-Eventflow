// US-044 (PB-P1-027 / QA-003) — AUTH matrix (AUTH-TS-01..08) + 404 SERVICE_NOT_FOUND uniforme.
// - AUTH-TS-01..03: dueño en pending/approved/rejected → CRUD ok.
// - AUTH-TS-04: dueño hidden → 409 PROFILE_HIDDEN.
// - AUTH-TS-05: dueño soft-deleted → 404 PROFILE_NOT_FOUND (perfil).
// - AUTH-TS-06: otro vendor → 404 SERVICE_NOT_FOUND (uniforme, no revela existencia).
// - AUTH-TS-07: anónimo → 401 AUTHENTICATION_REQUIRED.
// - AUTH-TS-08: admin/organizer → 403 FORBIDDEN.
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
const uniq = (p: string): string =>
  `us044auth_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

async function agentFor(role: 'organizer' | 'vendor'): Promise<ReturnType<typeof request.agent>> {
  const email = uniq(role);
  const agent = request.agent(app);
  const payload: Record<string, unknown> = {
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role,
    captchaToken: CAPTCHA,
  };
  if (role === 'vendor') payload.businessName = 'Vendor AUTH US044';
  else payload.name = 'Organizer AUTH US044';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe.skipIf(!dbUp)('US-044 QA-003 (con BD): matriz AUTH-TS-01..08', () => {
  let vendorApproved: ReturnType<typeof request.agent>;
  let vendorPending: ReturnType<typeof request.agent>;
  let vendorRejected: ReturnType<typeof request.agent>;
  let vendorHidden: ReturnType<typeof request.agent>;
  let vendorDeleted: ReturnType<typeof request.agent>;
  let otherVendor: ReturnType<typeof request.agent>;
  let organizerAgent: ReturnType<typeof request.agent>;

  let locationId = '';
  let cateringId = '';
  let ownedServiceId = '';

  async function createProfile(agent: ReturnType<typeof request.agent>): Promise<string> {
    const res = await agent.post('/api/v1/vendors/me').send({
      business_name: `AUTH ${Math.floor(Math.random() * 1e6)}`,
      bio: 'Perfil demo para matriz AUTH del CRUD VendorService, con longitud suficiente hola.',
      location_id: locationId,
      languages_supported: ['es-LATAM'],
      categories: [cateringId],
    });
    return res.body?.data?.id as string;
  }

  interface CreateResp {
    data?: { id?: string };
    error?: { code?: string };
  }

  async function createService(
    agent: ReturnType<typeof request.agent>,
  ): Promise<{ status: number; body: CreateResp }> {
    return agent
      .post('/api/v1/vendors/me/services')
      .send({
        package_name: 'Paquete AUTH',
        description: 'Descripción de al menos diez caracteres para el paquete AUTH.',
        base_price: '2000.00',
        currency_code: 'GTQ',
        service_category_id: cateringId,
      })
      .then((r) => ({ status: r.status, body: r.body }));
  }

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE vendor_services, vendor_profile_categories, vendor_profiles, sessions, password_reset_tokens, admin_actions, users RESTART IDENTITY CASCADE`,
    );

    locationId = (
      await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })
    ).id;
    cateringId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'catering' },
        update: { isActive: true, deletedAt: null },
        create: { code: 'catering', label: 'Catering', isActive: true, depthLevel: 1 },
      })
    ).id;

    // Vendor aprobado (dueño del servicio de prueba).
    vendorApproved = await agentFor('vendor');
    await createProfile(vendorApproved);
    const approvedUserId = (await vendorApproved.get('/api/v1/users/me')).body?.data
      ?.id as string;
    const approvedProfileId = (await prisma.vendorProfile.findFirst({
      where: { userId: approvedUserId },
    }))!.id;
    await prisma.vendorProfile.update({
      where: { id: approvedProfileId },
      data: { status: 'approved' },
    });
    const created = await createService(vendorApproved);
    ownedServiceId = created.body?.data?.id as string;

    vendorPending = await agentFor('vendor');
    await createProfile(vendorPending);

    vendorRejected = await agentFor('vendor');
    await createProfile(vendorRejected);
    const rejUid = (await vendorRejected.get('/api/v1/users/me')).body?.data?.id as string;
    const rejPid = (await prisma.vendorProfile.findFirst({ where: { userId: rejUid } }))!.id;
    await prisma.vendorProfile.update({ where: { id: rejPid }, data: { status: 'rejected' } });

    vendorHidden = await agentFor('vendor');
    await createProfile(vendorHidden);
    const hidUid = (await vendorHidden.get('/api/v1/users/me')).body?.data?.id as string;
    const hidPid = (await prisma.vendorProfile.findFirst({ where: { userId: hidUid } }))!.id;
    await prisma.vendorProfile.update({ where: { id: hidPid }, data: { status: 'hidden' } });

    vendorDeleted = await agentFor('vendor');
    await createProfile(vendorDeleted);
    const delUid = (await vendorDeleted.get('/api/v1/users/me')).body?.data?.id as string;
    const delPid = (await prisma.vendorProfile.findFirst({ where: { userId: delUid } }))!.id;
    await prisma.vendorProfile.update({
      where: { id: delPid },
      data: { deletedAt: new Date(), deletedBy: delUid },
    });

    otherVendor = await agentFor('vendor');
    await createProfile(otherVendor);

    organizerAgent = await agentFor('organizer');
  });

  // ── AUTH-TS-01..03: CRUD permitido para dueño en pending/approved/rejected ─
  it('AUTH-TS-02: dueño approved — GET → 200', async () => {
    const res = await vendorApproved.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(200);
  });

  it('AUTH-TS-01: dueño pending — POST → 201', async () => {
    const res = await createService(vendorPending);
    expect(res.status).toBe(201);
  });

  it('AUTH-TS-03: dueño rejected — POST → 201', async () => {
    const res = await createService(vendorRejected);
    expect(res.status).toBe(201);
  });

  // ── AUTH-TS-04: hidden ────────────────────────────────────────────────
  it('AUTH-TS-04: dueño hidden — POST → 409 PROFILE_HIDDEN', async () => {
    const res = await createService(vendorHidden);
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  it('AUTH-TS-04: dueño hidden — GET → 409 PROFILE_HIDDEN', async () => {
    const res = await vendorHidden.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  it('AUTH-TS-04: dueño hidden — DELETE → 409 PROFILE_HIDDEN', async () => {
    const res = await vendorHidden.delete(
      `/api/v1/vendors/me/services/${ownedServiceId}`,
    );
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  // ── AUTH-TS-05: soft-deleted ─────────────────────────────────────────
  it('AUTH-TS-05: dueño soft-deleted — GET → 404 PROFILE_NOT_FOUND', async () => {
    const res = await vendorDeleted.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('PROFILE_NOT_FOUND');
  });

  it('AUTH-TS-05: dueño soft-deleted — POST → 404 PROFILE_NOT_FOUND', async () => {
    const res = await createService(vendorDeleted);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('PROFILE_NOT_FOUND');
  });

  // ── AUTH-TS-06: otro vendor (información leak-safe) ──────────────────
  it('AUTH-TS-06: otro vendor — PATCH sobre servicio ajeno → 404 SERVICE_NOT_FOUND', async () => {
    const res = await otherVendor
      .patch(`/api/v1/vendors/me/services/${ownedServiceId}`)
      .send({ package_name: 'Intento ajeno' });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('AUTH-TS-06: otro vendor — DELETE sobre servicio ajeno → 404 SERVICE_NOT_FOUND', async () => {
    const res = await otherVendor.delete(`/api/v1/vendors/me/services/${ownedServiceId}`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('SEC-04: 404 SERVICE_NOT_FOUND uniforme para inexistente vs ajeno', async () => {
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const otherOnAlien = await otherVendor.delete(
      `/api/v1/vendors/me/services/${ownedServiceId}`,
    );
    const otherOnNonExistent = await otherVendor.delete(
      `/api/v1/vendors/me/services/${nonExistentId}`,
    );
    expect(otherOnAlien.body?.error?.code).toBe('SERVICE_NOT_FOUND');
    expect(otherOnNonExistent.body?.error?.code).toBe('SERVICE_NOT_FOUND');
    expect(otherOnAlien.status).toBe(otherOnNonExistent.status);
  });

  // ── AUTH-TS-07: anónimo ──────────────────────────────────────────────
  it('AUTH-TS-07: anónimo — GET → 401', async () => {
    const res = await request(app).get('/api/v1/vendors/me/services');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  // ── AUTH-TS-08: rol no vendor ────────────────────────────────────────
  it('AUTH-TS-08: organizer — GET → 403 FORBIDDEN', async () => {
    const res = await organizerAgent.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN');
  });

  it('AUTH-TS-08: organizer — POST → 403 FORBIDDEN', async () => {
    const res = await organizerAgent.post('/api/v1/vendors/me/services').send({
      package_name: 'X',
      description: 'x'.repeat(20),
      base_price: '10.00',
      currency_code: 'GTQ',
      service_category_id: cateringId,
    });
    expect(res.status).toBe(403);
  });

  it('AUTH-TS-08: organizer — DELETE → 403 FORBIDDEN', async () => {
    const res = await organizerAgent.delete(
      `/api/v1/vendors/me/services/${ownedServiceId}`,
    );
    expect(res.status).toBe(403);
  });
});
