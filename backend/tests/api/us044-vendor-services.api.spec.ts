// US-044 (PB-P1-027 / QA-002 + QA-004) — Tests HTTP end-to-end del CRUD `VendorService`.
// - DB-free: anónimos → 401; body malformado → 401 (auth corre antes que el validador Zod).
// - DB-gated (skipIf): matriz TS-01..05 + NT-01..07 + EC-09 idempotencia + shape del response.
//   Replica el patrón de US-041/US-043: si no hay Postgres alcanzable, la suite gated se salta.
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
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
  `us044_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

// Contract schema — QA-004. Espeja el DTO backend (`vendor-service.response.ts`).
const vendorServiceContract = z.object({
  id: z.string().uuid(),
  vendor_profile_id: z.string().uuid(),
  service_category_id: z.string().uuid(),
  package_name: z.string(),
  description: z.string(),
  base_price: z.string().regex(/^\d+(\.\d{2})$/),
  currency_code: z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD']),
  is_active: z.boolean(),
  ai_generated_description: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

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
  if (role === 'vendor') payload.businessName = 'Vendor US044';
  else payload.name = 'Organizer US044';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('US-044 QA-002 (sin BD): auth y validación', () => {
  it('SEC-T: GET anónimo → 401', async () => {
    const res = await request(app).get('/api/v1/vendors/me/services');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('SEC-T: POST anónimo → 401', async () => {
    const res = await request(app).post('/api/v1/vendors/me/services').send({});
    expect(res.status).toBe(401);
  });

  it('SEC-T: PATCH anónimo → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/vendors/me/services/11111111-1111-1111-1111-111111111111')
      .send({ package_name: 'X' });
    expect(res.status).toBe(401);
  });

  it('SEC-T: DELETE anónimo → 401', async () => {
    const res = await request(app).delete(
      '/api/v1/vendors/me/services/11111111-1111-1111-1111-111111111111',
    );
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbUp)('US-044 QA-002/004 (con BD): flujo end-to-end', () => {
  let vendorApproved: ReturnType<typeof request.agent>;
  let vendorPending: ReturnType<typeof request.agent>;
  let vendorHidden: ReturnType<typeof request.agent>;
  let vendorRejected: ReturnType<typeof request.agent>;

  let locationId = '';
  let cateringId = '';
  let inactiveCategoryId = '';

  async function createProfile(agent: ReturnType<typeof request.agent>): Promise<string> {
    const res = await agent.post('/api/v1/vendors/me').send({
      business_name: `Vendor US044 ${Math.floor(Math.random() * 1e6)}`,
      bio: 'Descripción de negocio para US-044 con al menos cincuenta caracteres válidos aquí.',
      location_id: locationId,
      languages_supported: ['es-LATAM'],
      categories: [cateringId],
    });
    return res.body?.data?.id as string;
  }

  interface CreateResponse {
    data?: { id?: string; is_active?: boolean; ai_generated_description?: boolean; base_price?: string };
    error?: { code?: string; message?: string };
  }

  async function createValidService(
    agent: ReturnType<typeof request.agent>,
    overrides: Partial<{
      package_name: string;
      description: string;
      base_price: string;
      currency_code: string;
      service_category_id: string;
    }> = {},
  ): Promise<{ status: number; body: CreateResponse }> {
    return agent
      .post('/api/v1/vendors/me/services')
      .send({
        package_name: 'Paquete Boda Premium',
        description: 'Descripción de al menos diez caracteres del paquete demo.',
        base_price: '1500.00',
        currency_code: 'GTQ',
        service_category_id: cateringId,
        ...overrides,
      })
      .then((r) => ({ status: r.status, body: r.body }));
  }

  beforeAll(async () => {
    // Limpieza estable — remueve datos que otros tests pueden dejar y elimina servicios
    // previos. Se preserva la migración estructural.
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
    await prisma.serviceCategory.upsert({
      where: { code: 'venue' },
      update: { isActive: true, deletedAt: null },
      create: { code: 'venue', label: 'Venue', isActive: true, depthLevel: 1 },
    });
    inactiveCategoryId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'inactive-category' },
        update: { isActive: false, deletedAt: null },
        create: {
          code: 'inactive-category',
          label: 'Inactive Category',
          isActive: false,
          depthLevel: 1,
        },
      })
    ).id;

    vendorApproved = await agentFor('vendor');
    await createProfile(vendorApproved);
    const approvedId = (await prisma.vendorProfile.findFirst({ orderBy: { createdAt: 'desc' } }))!
      .id;
    await prisma.vendorProfile.update({
      where: { id: approvedId },
      data: { status: 'approved' },
    });

    vendorPending = await agentFor('vendor');
    await createProfile(vendorPending);

    vendorHidden = await agentFor('vendor');
    await createProfile(vendorHidden);
    const hiddenUserId = (await vendorHidden.get('/api/v1/users/me')).body?.data?.id as string;
    const hiddenProfileId = (await prisma.vendorProfile.findFirst({
      where: { userId: hiddenUserId },
    }))!.id;
    await prisma.vendorProfile.update({
      where: { id: hiddenProfileId },
      data: { status: 'hidden' },
    });

    vendorRejected = await agentFor('vendor');
    await createProfile(vendorRejected);
    const rejectedUserId = (await vendorRejected.get('/api/v1/users/me')).body?.data?.id as string;
    const rejectedProfileId = (await prisma.vendorProfile.findFirst({
      where: { userId: rejectedUserId },
    }))!.id;
    await prisma.vendorProfile.update({
      where: { id: rejectedProfileId },
      data: { status: 'rejected' },
    });

    // No se necesita organizer aquí — la matriz AUTH vive en `us044-vendor-services-auth.api.spec.ts`.
  });

  // ── AC-01a POST ───────────────────────────────────────────────────────
  it('TS-01/AC-01a: POST crea servicio con is_active=true → 201 + shape', async () => {
    const res = await createValidService(vendorApproved);
    expect(res.status).toBe(201);
    const parsed = vendorServiceContract.safeParse(res.body?.data);
    expect(parsed.success).toBe(true);
    expect(res.body?.data?.is_active).toBe(true);
    expect(res.body?.data?.ai_generated_description).toBe(false);
    expect(res.body?.data?.base_price).toBe('1500.00');
  });

  it('AC-01a: POST desde pending → 201 (D1 permitido)', async () => {
    const res = await createValidService(vendorPending);
    expect(res.status).toBe(201);
  });

  it('AC-01a: POST desde rejected → 201 (D1 permitido)', async () => {
    const res = await createValidService(vendorRejected);
    expect(res.status).toBe(201);
  });

  // ── EC negativos ──────────────────────────────────────────────────────
  it('NT-01/EC-01: base_price negativo (regex) → 400 VALIDATION_ERROR', async () => {
    const res = await createValidService(vendorApproved, { base_price: '-5.00' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-02/EC-02: categoría inactiva → 400 INVALID_CATEGORY', async () => {
    const res = await createValidService(vendorApproved, {
      service_category_id: inactiveCategoryId,
    });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CATEGORY');
  });

  it('NT-03/EC-03: currency fuera del enum → 400 VALIDATION_ERROR', async () => {
    const res = await createValidService(vendorApproved, { currency_code: 'JPY' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-05/EC-05: package_name corto → 400 VALIDATION_ERROR', async () => {
    const res = await createValidService(vendorApproved, { package_name: 'a' });
    expect(res.status).toBe(400);
  });

  it('NT-06/EC-05: description corta → 400 VALIDATION_ERROR', async () => {
    const res = await createValidService(vendorApproved, { description: 'corto' });
    expect(res.status).toBe(400);
  });

  it('NT-08/EC-06: perfil hidden → 409 PROFILE_HIDDEN', async () => {
    const res = await createValidService(vendorHidden);
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_HIDDEN');
  });

  // ── AC-01b PATCH ──────────────────────────────────────────────────────
  it('TS-02/AC-01b: PATCH actualiza campo → 200 con shape', async () => {
    const create = await createValidService(vendorApproved, {
      package_name: 'Paquete a Editar',
    });
    const serviceId = create.body?.data?.id as string;
    const res = await vendorApproved
      .patch(`/api/v1/vendors/me/services/${serviceId}`)
      .send({ package_name: 'Paquete Editado' });
    expect(res.status).toBe(200);
    expect(res.body?.data?.package_name).toBe('Paquete Editado');
    const parsed = vendorServiceContract.safeParse(res.body?.data);
    expect(parsed.success).toBe(true);
  });

  it('TS-04/AC-01b: PATCH { is_active: true } reactiva → 200 con is_active=true', async () => {
    const create = await createValidService(vendorApproved);
    const serviceId = create.body?.data?.id as string;
    // Desactivar primero.
    await vendorApproved.delete(`/api/v1/vendors/me/services/${serviceId}`);
    const res = await vendorApproved
      .patch(`/api/v1/vendors/me/services/${serviceId}`)
      .send({ is_active: true });
    expect(res.status).toBe(200);
    expect(res.body?.data?.is_active).toBe(true);
  });

  it('NT-07/EC-08: PATCH sobre id ajeno → 404 SERVICE_NOT_FOUND', async () => {
    const create = await createValidService(vendorApproved);
    const serviceId = create.body?.data?.id as string;
    const res = await vendorPending
      .patch(`/api/v1/vendors/me/services/${serviceId}`)
      .send({ package_name: 'Intento ajeno' });
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  it('PATCH con id no UUID → 400 VALIDATION_ERROR / INVALID_UUID', async () => {
    const res = await vendorApproved
      .patch('/api/v1/vendors/me/services/not-a-uuid')
      .send({ package_name: 'X' });
    expect(res.status).toBe(400);
    expect(['INVALID_UUID', 'VALIDATION_ERROR']).toContain(res.body?.error?.code);
  });

  it('PATCH con service_category_id inexistente → 400 INVALID_CATEGORY', async () => {
    const create = await createValidService(vendorApproved);
    const serviceId = create.body?.data?.id as string;
    const res = await vendorApproved
      .patch(`/api/v1/vendors/me/services/${serviceId}`)
      .send({ service_category_id: '99999999-9999-9999-9999-999999999999' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CATEGORY');
  });

  // ── AC-01c DELETE ─────────────────────────────────────────────────────
  it('TS-03/AC-01c: DELETE sobre activo → 204 y GET lo lista inactivo', async () => {
    const create = await createValidService(vendorApproved, { package_name: 'A desactivar' });
    const serviceId = create.body?.data?.id as string;
    const del = await vendorApproved.delete(`/api/v1/vendors/me/services/${serviceId}`);
    expect(del.status).toBe(204);
    const list = await vendorApproved.get('/api/v1/vendors/me/services');
    const items = (list.body?.data?.items ?? []) as Array<{ id: string; is_active: boolean }>;
    const item = items.find((x) => x.id === serviceId);
    expect(item?.is_active).toBe(false);
  });

  it('EC-09: DELETE idempotente sobre servicio ya inactivo → 204', async () => {
    const create = await createValidService(vendorApproved);
    const serviceId = create.body?.data?.id as string;
    await vendorApproved.delete(`/api/v1/vendors/me/services/${serviceId}`);
    const again = await vendorApproved.delete(`/api/v1/vendors/me/services/${serviceId}`);
    expect(again.status).toBe(204);
  });

  it('NT-07/EC-08: DELETE sobre id ajeno → 404 SERVICE_NOT_FOUND', async () => {
    const create = await createValidService(vendorApproved);
    const serviceId = create.body?.data?.id as string;
    const res = await vendorPending.delete(`/api/v1/vendors/me/services/${serviceId}`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('SERVICE_NOT_FOUND');
  });

  // ── AC-01d GET ────────────────────────────────────────────────────────
  it('TS-05/AC-01d: GET retorna items ordenados por created_at desc (activos + inactivos)', async () => {
    const res = await vendorApproved.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(200);
    const items = (res.body?.data?.items ?? []) as Array<{ created_at: string }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    // Orden desc por created_at.
    for (let i = 1; i < items.length; i++) {
      expect(new Date(items[i - 1]!.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(items[i]!.created_at).getTime(),
      );
    }
    // Cada item respeta el contrato.
    for (const item of items) {
      expect(vendorServiceContract.safeParse(item).success).toBe(true);
    }
  });
});
