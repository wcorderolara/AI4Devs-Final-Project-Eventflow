// US-041 (PB-P1-024 / QA-002+003+004) — Tests HTTP end-to-end de
// `PATCH /api/v1/vendors/me` y `DELETE /api/v1/vendors/me`.
// - DB-free: anónimo → 401; body vacío → 400 VALIDATION_ERROR; extras → 400.
// - DB-gated (skipIf): TS-01..06 + NT-01..10 + AUTH + AdminAction insert.
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
  `us041_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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
  if (role === 'vendor') payload.businessName = 'Vendor Reg US041';
  else payload.name = 'Organizer';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('US-041 QA-002/003 (sin BD): auth y validación de body', () => {
  it('SEC-T: PATCH anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).patch('/api/v1/vendors/me').send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('SEC-T: DELETE anónimo → 401', async () => {
    const res = await request(app).delete('/api/v1/vendors/me');
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbUp)('US-041 QA-002/003/004 (con BD): flujo end-to-end', () => {
  let vendorAgent: ReturnType<typeof request.agent>;
  let organizerAgent: ReturnType<typeof request.agent>;
  let vendorNoProfile: ReturnType<typeof request.agent>;
  let vendorHidden: ReturnType<typeof request.agent>;
  let vendorRejected: ReturnType<typeof request.agent>;
  let vendorDeleted: ReturnType<typeof request.agent>;
  let vendorPending: ReturnType<typeof request.agent>;

  let locationId = '';
  let secondLocationId = '';
  let inactiveLocationId = '';
  let cateringId = '';

  async function createProfileFor(agent: ReturnType<typeof request.agent>): Promise<string> {
    const res = await agent
      .post('/api/v1/vendors/me')
      .send({
        business_name: `Vendor ${Math.floor(Math.random() * 1e6)}`,
        bio: 'Descripción de negocio para US-041 test con al menos cincuenta caracteres válidos.',
        location_id: locationId,
        languages_supported: ['es-LATAM'],
        categories: [cateringId],
      });
    return res.body?.data?.id as string;
  }

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE admin_actions, vendor_profile_categories, vendor_profiles, sessions, password_reset_tokens, users RESTART IDENTITY CASCADE`,
    );
    locationId = (
      await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })
    ).id;
    secondLocationId = (
      await prisma.location.create({ data: { country: 'GT', city: 'Antigua' } })
    ).id;
    inactiveLocationId = (
      await prisma.location.create({
        data: { country: 'GT', city: 'Deleted City', deletedAt: new Date() },
      })
    ).id;
    cateringId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'catering' },
        update: { isActive: true, deletedAt: null },
        create: { code: 'catering', label: 'Catering', isActive: true, depthLevel: 1 },
      })
    ).id;
    await prisma.serviceCategory.upsert({
      where: { code: 'venue' },
      update: { isActive: true, deletedAt: null },
      create: { code: 'venue', label: 'Venue', isActive: true, depthLevel: 1 },
    });

    // Vendors preparados con diferentes estados.
    vendorAgent = await agentFor('vendor');
    await createProfileFor(vendorAgent);
    // Aprobamos el perfil directamente vía Prisma (no hay endpoint admin todavía).
    const vpId = (await prisma.vendorProfile.findFirst({ orderBy: { createdAt: 'desc' } }))!.id;
    await prisma.vendorProfile.update({ where: { id: vpId }, data: { status: 'approved' } });

    organizerAgent = await agentFor('organizer');
    vendorNoProfile = await agentFor('vendor');
    vendorPending = await agentFor('vendor');
    await createProfileFor(vendorPending);
    // Se queda con status='pending' (default de creación).

    vendorHidden = await agentFor('vendor');
    await createProfileFor(vendorHidden);
    const hiddenId = (
      await prisma.vendorProfile.findFirst({
        where: { userId: (await vendorHidden.get('/api/v1/users/me')).body?.data?.id as string },
      })
    )!.id;
    await prisma.vendorProfile.update({ where: { id: hiddenId }, data: { status: 'hidden' } });

    vendorRejected = await agentFor('vendor');
    await createProfileFor(vendorRejected);
    const rejectedId = (
      await prisma.vendorProfile.findFirst({
        where: { userId: (await vendorRejected.get('/api/v1/users/me')).body?.data?.id as string },
      })
    )!.id;
    await prisma.vendorProfile.update({ where: { id: rejectedId }, data: { status: 'rejected' } });

    vendorDeleted = await agentFor('vendor');
    await createProfileFor(vendorDeleted);
    const deletedId = (
      await prisma.vendorProfile.findFirst({
        where: { userId: (await vendorDeleted.get('/api/v1/users/me')).body?.data?.id as string },
      })
    )!.id;
    await prisma.vendorProfile.update({
      where: { id: deletedId },
      data: { deletedAt: new Date(), deletedBy: (await vendorDeleted.get('/api/v1/users/me')).body?.data?.id as string },
    });
  });

  it('TS-01/AC-01: PATCH menor (bio) en approved → 200, repending=false', async () => {
    const res = await vendorAgent
      .patch('/api/v1/vendors/me')
      .send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(false);
    expect(res.body?.data?.profile?.status).toBe('approved');
  });

  it('TS-02/AC-02: PATCH mayor (business_name) desde approved → 200, repending=true + AdminAction', async () => {
    const before = await prisma.adminAction.count({ where: { action: 'vendor_pending_after_major_edit' } });
    const res = await vendorAgent
      .patch('/api/v1/vendors/me')
      .send({ business_name: 'Nueva Marca US-041' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(true);
    expect(res.body?.data?.profile?.status).toBe('pending');
    const after = await prisma.adminAction.count({ where: { action: 'vendor_pending_after_major_edit' } });
    expect(after - before).toBe(1);
    const record = await prisma.adminAction.findFirst({
      where: { action: 'vendor_pending_after_major_edit' },
      orderBy: { createdAt: 'desc' },
    });
    expect(record?.actorRole).toBe('vendor');
    expect(record?.correlationId).toBeTruthy();
    // Perfil ahora está pending; regresamos a approved para tests posteriores.
    await prisma.vendorProfile.update({
      where: { id: record!.targetId },
      data: { status: 'approved' },
    });
  });

  it('TS-03/AC-02+EC-06: PATCH mayor+menor combinado desde approved → transiciona', async () => {
    const res = await vendorAgent
      .patch('/api/v1/vendors/me')
      .send({ business_name: 'Mixto', bio: 'x'.repeat(60) });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(true);
    expect(res.body?.data?.profile?.status).toBe('pending');
    // Restaurar approved para el siguiente test.
    await prisma.vendorProfile.updateMany({
      where: { userId: (await vendorAgent.get('/api/v1/users/me')).body?.data?.id as string },
      data: { status: 'approved' },
    });
  });

  it('TS-04/AC-03: PATCH mayor desde pending → sin transición ni AdminAction', async () => {
    const before = await prisma.adminAction.count({ where: { action: 'vendor_pending_after_major_edit' } });
    const res = await vendorPending
      .patch('/api/v1/vendors/me')
      .send({ business_name: 'Cambio en pending' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.repending).toBe(false);
    expect(res.body?.data?.profile?.status).toBe('pending');
    const after = await prisma.adminAction.count({ where: { action: 'vendor_pending_after_major_edit' } });
    expect(after - before).toBe(0);
  });

  it('TS-06/AC-06: cambiar business_name NO regenera el slug', async () => {
    const before = (await vendorAgent.get('/api/v1/users/me')).body?.data?.id as string;
    const beforeSlug = (
      await prisma.vendorProfile.findFirst({ where: { userId: before }, select: { slug: true } })
    )!.slug;
    await vendorAgent.patch('/api/v1/vendors/me').send({ business_name: 'Otro nombre' });
    const afterSlug = (
      await prisma.vendorProfile.findFirst({ where: { userId: before }, select: { slug: true } })
    )!.slug;
    expect(afterSlug).toBe(beforeSlug);
    // Restaurar approved.
    await prisma.vendorProfile.updateMany({ where: { userId: before }, data: { status: 'approved' } });
  });

  it('NT-01/EC-03: PATCH en rejected → 409 PROFILE_REJECTED', async () => {
    const res = await vendorRejected
      .patch('/api/v1/vendors/me')
      .send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_REJECTED');
  });

  it('NT-02/EC-04: PATCH en hidden → 409 PROFILE_HIDDEN', async () => {
    const res = await vendorHidden
      .patch('/api/v1/vendors/me')
      .send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  it('NT-04..06 / VR-05 / VR-08: PATCH con `categories`/`slug`/`status` en body → 400', async () => {
    for (const extra of [{ categories: [cateringId] }, { slug: 'x' }, { status: 'approved' }]) {
      const res = await vendorAgent.patch('/api/v1/vendors/me').send(extra);
      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    }
  });

  it('NT-07 / VR-09: PATCH body vacío → 400', async () => {
    const res = await vendorAgent.patch('/api/v1/vendors/me').send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-08 / EC-07: location_id inactiva → 400 con field location_id', async () => {
    const res = await vendorAgent
      .patch('/api/v1/vendors/me')
      .send({ location_id: inactiveLocationId });
    expect(res.status).toBe(400);
    expect(res.body?.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'location_id' })]),
    );
  });

  it('NT-08 (location válida): PATCH con location_id activa distinta → 200', async () => {
    const res = await vendorAgent
      .patch('/api/v1/vendors/me')
      .send({ location_id: secondLocationId });
    expect(res.status).toBe(200);
    expect(res.body?.data?.profile?.location_id).toBe(secondLocationId);
    expect(res.body?.data?.repending).toBe(true); // location_id es mayor.
    await prisma.vendorProfile.updateMany({
      where: { userId: (await vendorAgent.get('/api/v1/users/me')).body?.data?.id as string },
      data: { status: 'approved' },
    });
  });

  it('NT-09 / VR-01: bio < 50 chars → 400', async () => {
    const res = await vendorAgent.patch('/api/v1/vendors/me').send({ bio: 'corto' });
    expect(res.status).toBe(400);
  });

  it('NT-10: vendor sin perfil → 404 PROFILE_NOT_FOUND', async () => {
    const res = await vendorNoProfile
      .patch('/api/v1/vendors/me')
      .send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('PROFILE_NOT_FOUND');
  });

  it('AUTH-TS-03: organizer → 403', async () => {
    const res = await organizerAgent
      .patch('/api/v1/vendors/me')
      .send({ bio: 'x'.repeat(60) });
    expect(res.status).toBe(403);
  });

  it('TS-05/AC-05: DELETE en approved → 204 y perfil marcado deletedAt', async () => {
    const userIdBefore = (await vendorAgent.get('/api/v1/users/me')).body?.data?.id as string;
    const res = await vendorAgent.delete('/api/v1/vendors/me');
    expect(res.status).toBe(204);
    const row = await prisma.vendorProfile.findFirst({ where: { userId: userIdBefore } });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(userIdBefore);
  });

  it('EC-05: DELETE sobre perfil ya soft-deleted → 409 PROFILE_DELETED', async () => {
    const res = await vendorDeleted.delete('/api/v1/vendors/me');
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_DELETED');
  });

  it('EC-04: DELETE en hidden → 409 PROFILE_HIDDEN', async () => {
    const res = await vendorHidden.delete('/api/v1/vendors/me');
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });
});
