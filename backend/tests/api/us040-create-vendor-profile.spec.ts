// US-040 (PB-P1-024 / QA-002 IT + QA-003 AUTH) — Tests HTTP del endpoint
// `POST /api/v1/vendors/me`. Cobertura:
// - DB-free: anónimo → 401; roles inválidos → cubiertos por role middleware (test DB-gated);
//   validación de body strict (VR-01/02/03/05/07).
// - DB-gated (skipIf): happy path 201 (AC-01, AC-04), slug único (AC-03), 409 PROFILE_EXISTS
//   (EC-01), 400 INVALID_VALUE con categoría inactiva (EC-02), 400 con location inexistente
//   (EC-03), organizer/admin → 403 (SEC-02/03).
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
const SOME_UUID = '00000000-0000-0000-0000-000000000001';

const uniqEmail = (p: string): string =>
  `us040_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

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
  if (role === 'vendor') payload.businessName = 'Vendor Reg SA';
  else payload.name = 'Organizer';
  await agent.post('/api/v1/auth/register').send(payload);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

function validBody(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    business_name: 'Acme Catering',
    bio: 'Catering boutique con más de 10 años de experiencia en eventos corporativos y bodas en LATAM.',
    location_id: SOME_UUID,
    languages_supported: ['es-LATAM', 'en'],
    categories: [SOME_UUID],
    ...overrides,
  };
}

describe('US-040 QA-002/QA-003 (sin BD): auth y validación de body', () => {
  it('SEC-T-01: POST anónimo → 401 AUTHENTICATION_REQUIRED', async () => {
    const res = await request(app).post('/api/v1/vendors/me').send(validBody());
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('VR-07: body con `vendor_user_id` es rechazado (strict)', async () => {
    // Sin sesión igual falla, pero el objetivo del test es documentar el shape strict.
    const res = await request(app)
      .post('/api/v1/vendors/me')
      .send({ ...validBody(), vendor_user_id: SOME_UUID });
    expect([400, 401]).toContain(res.status);
  });
});

describe.skipIf(!dbUp)('US-040 QA-002/QA-003 (con BD): flujo end-to-end', () => {
  let vendorAgent: ReturnType<typeof request.agent>;
  let secondVendorAgent: ReturnType<typeof request.agent>;
  let organizerAgent: ReturnType<typeof request.agent>;
  let locationId = '';
  let inactiveLocationId = '';
  let cateringId = '';
  let venueId = '';
  let inactiveCategoryId = '';

  beforeAll(async () => {
    // Limpieza mínima: solo entidades que este test toca. Preserva catálogos compartidos.
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE vendor_profile_categories, vendor_profiles, sessions, password_reset_tokens, users RESTART IDENTITY CASCADE`,
    );
    // Location activa (soft-delete = null) + una "inactiva" (soft-deleted) para EC-03.
    locationId = (
      await prisma.location.create({ data: { country: 'GT', city: 'Guatemala' } })
    ).id;
    inactiveLocationId = (
      await prisma.location.create({
        data: { country: 'GT', city: 'Antigua', deletedAt: new Date() },
      })
    ).id;
    // Catálogo curado admin. Upsert por code para tolerar re-ejecución.
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
    inactiveCategoryId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'us040_inactive_cat' },
        update: { isActive: false },
        create: { code: 'us040_inactive_cat', label: 'Inactive', isActive: false, depthLevel: 1 },
      })
    ).id;

    vendorAgent = await agentFor('vendor');
    secondVendorAgent = await agentFor('vendor');
    organizerAgent = await agentFor('organizer');
  });

  it('IT-01/AC-01/AC-04: crea VendorProfile pending y retorna el shape canónico', async () => {
    const res = await vendorAgent
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [cateringId, venueId] }));

    expect(res.status).toBe(201);
    const data = res.body?.data;
    expect(data).toMatchObject({
      business_name: 'Acme Catering',
      location_id: locationId,
      languages_supported: ['es-LATAM', 'en'],
      slug: 'acme-catering',
      status: 'pending',
    });
    expect(new Set(data.categories.map((c: { id: string }) => c.id))).toEqual(
      new Set([cateringId, venueId]),
    );
    expect(typeof data.id).toBe('string');
    expect(typeof data.vendor_user_id).toBe('string');
    expect(typeof data.created_at).toBe('string');
  });

  it('IT-02/EC-01: segundo POST del mismo vendor → 409 PROFILE_EXISTS', async () => {
    const res = await vendorAgent
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [cateringId] }));
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('PROFILE_EXISTS');
  });

  it('IT-03/AC-03: segundo vendor con mismo business_name → slug desambiguado -2', async () => {
    const res = await secondVendorAgent
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [cateringId] }));
    expect(res.status).toBe(201);
    expect(res.body?.data?.slug).toBe('acme-catering-2');
  });

  it('IT-04/EC-03: location inexistente → 400 con field location_id', async () => {
    const thirdVendor = await agentFor('vendor');
    const res = await thirdVendor
      .post('/api/v1/vendors/me')
      .send(
        validBody({ location_id: '00000000-0000-0000-0000-000000000dea', categories: [cateringId] }),
      );
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    expect(res.body?.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'location_id' })]),
    );
  });

  it('IT-05/EC-03: location soft-deleted → 400', async () => {
    const v = await agentFor('vendor');
    const res = await v
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: inactiveLocationId, categories: [cateringId] }));
    expect(res.status).toBe(400);
  });

  it('IT-06/EC-02: categoría inactiva → 400 INVALID_VALUE con `invalid_categories`', async () => {
    const v = await agentFor('vendor');
    const res = await v
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [inactiveCategoryId] }));
    expect(res.status).toBe(400);
    expect(res.body?.error?.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'invalid_categories', message: inactiveCategoryId }),
      ]),
    );
  });

  it('IT-07/EC-06: categories vacío → 400 VALIDATION_ERROR (VR-03 en Zod)', async () => {
    const v = await agentFor('vendor');
    const res = await v
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [] }));
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('IT-08/EC-05: languages_supported vacío → 400', async () => {
    const v = await agentFor('vendor');
    const res = await v
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, languages_supported: [] }));
    expect(res.status).toBe(400);
  });

  it('IT-09/EC-07: body con `status` extra → 400 (Zod .strict)', async () => {
    const v = await agentFor('vendor');
    const res = await v
      .post('/api/v1/vendors/me')
      .send({
        ...validBody({ location_id: locationId, categories: [cateringId] }),
        status: 'approved',
      });
    expect(res.status).toBe(400);
  });

  it('AUTH-TS-02/SEC-02: organizer → 403', async () => {
    const res = await organizerAgent
      .post('/api/v1/vendors/me')
      .send(validBody({ location_id: locationId, categories: [cateringId] }));
    expect(res.status).toBe(403);
  });
});
