// US-044 (PB-P1-027 / QA-004) — Contract tests del response shape.
// Valida que los DTOs enviados por el backend cumplen el schema del §9 API Contract,
// tanto en la superficie success (envelope `{ data, correlationId }`) como en el error envelope
// unificado (`{ error: { code, message, ... } }`). Estos tests son la salvaguarda contra drifts
// silenciosos entre backend y frontend (RHF + Zod espejo consume esta forma).
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
  `us044contract_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

// ── Schemas de contrato ──────────────────────────────────────────────────
const vendorServiceSchema = z
  .object({
    id: z.string().uuid(),
    vendor_profile_id: z.string().uuid(),
    service_category_id: z.string().uuid(),
    package_name: z.string().min(2).max(150),
    description: z.string().min(10).max(2000),
    base_price: z.string().regex(/^\d+\.\d{2}$/),
    currency_code: z.enum(['GTQ', 'EUR', 'MXN', 'COP', 'USD']),
    is_active: z.boolean(),
    ai_generated_description: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict();

const envelopeMeta = z.object({
  correlationId: z.string().min(1),
  timestamp: z.string().datetime(),
});

const successSingle = z
  .object({
    data: vendorServiceSchema,
    meta: envelopeMeta,
  })
  .passthrough();

const successList = z
  .object({
    data: z.object({ items: z.array(vendorServiceSchema) }).strict(),
    meta: envelopeMeta,
  })
  .passthrough();

const errorEnvelope = z.object({
  error: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
      details: z.array(z.unknown()).optional(),
      correlationId: z.string().min(1),
    })
    .passthrough(),
});

async function agentFor(role: 'vendor'): Promise<ReturnType<typeof request.agent>> {
  const email = uniq(role);
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role,
    captchaToken: CAPTCHA,
    businessName: 'Vendor Contract US044',
  });
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe.skipIf(!dbUp)('US-044 QA-004 (con BD): contract shape', () => {
  let vendorApproved: ReturnType<typeof request.agent>;
  let locationId = '';
  let cateringId = '';
  let serviceId = '';

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

    vendorApproved = await agentFor('vendor');
    await vendorApproved.post('/api/v1/vendors/me').send({
      business_name: 'Vendor Contract',
      bio: 'Descripción para tests de contrato del CRUD VendorService con suficiente longitud.',
      location_id: locationId,
      languages_supported: ['es-LATAM'],
      categories: [cateringId],
    });
    const pid = (await prisma.vendorProfile.findFirst({ orderBy: { createdAt: 'desc' } }))!.id;
    await prisma.vendorProfile.update({ where: { id: pid }, data: { status: 'approved' } });

    const create = await vendorApproved.post('/api/v1/vendors/me/services').send({
      package_name: 'Paquete Contract',
      description: 'Descripción demo con al menos diez caracteres para pasar el mínimo.',
      base_price: '2500.50',
      currency_code: 'GTQ',
      service_category_id: cateringId,
    });
    serviceId = create.body?.data?.id as string;
  });

  it('POST /vendors/me/services → envelope success + shape', async () => {
    const res = await vendorApproved.post('/api/v1/vendors/me/services').send({
      package_name: 'Paquete Otro',
      description: 'Otra descripción de al menos diez caracteres para el contrato.',
      base_price: '999.99',
      currency_code: 'USD',
      service_category_id: cateringId,
    });
    expect(res.status).toBe(201);
    const parsed = successSingle.safeParse(res.body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(parsed.error.format());
    }
    expect(parsed.success).toBe(true);
  });

  it('PATCH /vendors/me/services/:id → envelope success + shape', async () => {
    const res = await vendorApproved
      .patch(`/api/v1/vendors/me/services/${serviceId}`)
      .send({ package_name: 'Contract PATCH' });
    expect(res.status).toBe(200);
    expect(successSingle.safeParse(res.body).success).toBe(true);
  });

  it('DELETE /vendors/me/services/:id → 204 sin body', async () => {
    const res = await vendorApproved.delete(`/api/v1/vendors/me/services/${serviceId}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('GET /vendors/me/services → envelope { items: VendorService[] }', async () => {
    const res = await vendorApproved.get('/api/v1/vendors/me/services');
    expect(res.status).toBe(200);
    const parsed = successList.safeParse(res.body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error(parsed.error.format());
    }
    expect(parsed.success).toBe(true);
  });

  it('POST con body inválido → error envelope con `error.code` string', async () => {
    const res = await vendorApproved
      .post('/api/v1/vendors/me/services')
      .send({ package_name: 'a' });
    expect(res.status).toBe(400);
    expect(errorEnvelope.safeParse(res.body).success).toBe(true);
  });

  it('PATCH sobre id inexistente ajeno → error envelope con code=SERVICE_NOT_FOUND', async () => {
    const res = await vendorApproved
      .patch('/api/v1/vendors/me/services/99999999-9999-9999-9999-999999999999')
      .send({ package_name: 'Paquete Inexistente' });
    expect(res.status).toBe(404);
    const parsed = errorEnvelope.safeParse(res.body);
    expect(parsed.success).toBe(true);
    expect(res.body?.error?.code).toBe('SERVICE_NOT_FOUND');
  });
});
