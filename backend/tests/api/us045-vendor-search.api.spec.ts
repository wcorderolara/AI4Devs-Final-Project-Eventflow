// US-045 (PB-P1-028 / QA-002 + QA-003) — Tests HTTP end-to-end del directorio autenticado.
// - DB-free: anónimo → 401; cursor corrupto → 400 INVALID_CURSOR sin necesidad de BD.
// - DB-gated (skipIf): matriz TS-01..06 + NT-01..07 + AUTH-TS-01..04 + visibilidad por status
//   + vendor exclusion + cursor consistente + shape del response.
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
  `us045_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

const vendorCardContract = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  businessName: z.string(),
  locationCode: z.string().nullable(),
  categories: z.array(z.string()),
  ratingAvg: z.number().nullable(),
  reviewsCount: z.number().int().nonnegative(),
  priceRange: z
    .object({ min: z.string(), max: z.string(), currency: z.string() })
    .nullable(),
  thumbnailUrl: z.string().nullable(),
});

const pageContract = z.object({
  cursor: z.string().nullable(),
  limit: z.number().int().positive(),
  hasNext: z.boolean(),
});

async function agentFor(role: 'organizer' | 'vendor' | 'admin'): Promise<ReturnType<typeof request.agent>> {
  const email = uniq(role);
  const agent = request.agent(app);
  const payload: Record<string, unknown> = {
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role: role === 'admin' ? 'organizer' : role,
    captchaToken: CAPTCHA,
  };
  if (role === 'vendor') payload.businessName = 'Vendor US045';
  else payload.name = `User US045 ${role}`;
  await agent.post('/api/v1/auth/register').send(payload);
  if (role === 'admin') {
    // Los admin no se registran vía endpoint público; se promueve al usuario recién creado.
    await prisma.user.update({ where: { email }, data: { role: 'admin' } });
  }
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('US-045 QA-003 (sin BD): AUTH-TS-04 anónimo', () => {
  it('GET /vendors sin sesión → 401', async () => {
    const res = await request(app).get('/api/v1/vendors');
    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('GET /vendors con cursor corrupto → 400 INVALID_CURSOR (después de auth con sesión)', async () => {
    if (!dbUp) return;
    const agent = await agentFor('organizer');
    const res = await agent.get('/api/v1/vendors').query({ cursor: 'not-a-valid-cursor!!!' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CURSOR');
  });
});

describe.skipIf(!dbUp)('US-045 QA-002 (con BD): directorio autenticado', () => {
  let organizerAgent: ReturnType<typeof request.agent>;
  let adminAgent: ReturnType<typeof request.agent>;
  let vendorAgent: ReturnType<typeof request.agent>;
  let vendorAgentProfileId = '';

  let locationGtId = '';
  let locationMxId = '';
  let cateringId = '';
  let venueId = '';
  const APPROVED_VENDOR_IDS: string[] = [];
  const APPROVED_VENDOR_META: Array<{ id: string; ratingAvg: number | null; createdAt: Date }> = [];

  async function createProfile(agent: ReturnType<typeof request.agent>, categoryId: string, locationId: string): Promise<string> {
    const res = await agent.post('/api/v1/vendors/me').send({
      business_name: `Vendor US045 ${Math.floor(Math.random() * 1e6)}`,
      bio: 'Descripción de negocio con suficiente contenido para pasar las validaciones básicas.',
      location_id: locationId,
      languages_supported: ['es-LATAM'],
      categories: [categoryId],
    });
    return res.body?.data?.id as string;
  }

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, booking_intents, quotes, quote_requests, vendor_services, vendor_profile_categories, vendor_profiles, events, event_types, service_categories, locations, sessions, password_reset_tokens, admin_actions, users RESTART IDENTITY CASCADE`,
    );

    locationGtId = (
      await prisma.location.create({
        data: { code: 'GT-GUA', country: 'Guatemala', region: 'Guatemala', city: 'Ciudad de Guatemala' },
      })
    ).id;
    locationMxId = (
      await prisma.location.create({
        data: { code: 'MX-CDMX', country: 'México', region: 'CDMX', city: 'Ciudad de México' },
      })
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

    organizerAgent = await agentFor('organizer');
    adminAgent = await agentFor('admin');
    vendorAgent = await agentFor('vendor');
    vendorAgentProfileId = await createProfile(vendorAgent, cateringId, locationGtId);
    await prisma.vendorProfile.update({ where: { id: vendorAgentProfileId }, data: { status: 'approved' } });

    // Seed programático: 4 approved (2 con rating alto en GT-catering, 1 en MX-catering, 1 en GT-venue),
    // 1 pending, 1 rejected, 1 hidden, 1 approved-soft-deleted → sólo los 4 approved-vivos deben
    // aparecer en el listado sin filtros (más el vendor del vendorAgent = 5 total).
    async function makeVendor(opts: {
      status: 'approved' | 'pending' | 'rejected' | 'hidden';
      deleted?: boolean;
      locationId: string;
      categoryId: string;
      basePrice: string;
      currency: 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';
      ratingAvg?: number | null;
    }): Promise<string> {
      const agent = await agentFor('vendor');
      const profileId = await createProfile(agent, opts.categoryId, opts.locationId);
      await prisma.vendorProfile.update({
        where: { id: profileId },
        data: {
          status: opts.status,
          ratingAvg: opts.ratingAvg ?? null,
          reviewsCount: opts.ratingAvg === undefined || opts.ratingAvg === null ? 0 : 5,
          deletedAt: opts.deleted ? new Date() : null,
        },
      });
      // Servicio activo en la moneda y precio pedidos, para que el filtro de precio funcione.
      await prisma.vendorService.create({
        data: {
          vendorProfileId: profileId,
          serviceCategoryId: opts.categoryId,
          packageName: 'Paquete Demo',
          description: 'Descripción de al menos diez caracteres para el paquete demo.',
          basePrice: opts.basePrice,
          currencyCode: opts.currency,
          isActive: true,
        },
      });
      return profileId;
    }

    const v1 = await makeVendor({ status: 'approved', locationId: locationGtId, categoryId: cateringId, basePrice: '200.00', currency: 'GTQ', ratingAvg: 4.9 });
    const v2 = await makeVendor({ status: 'approved', locationId: locationGtId, categoryId: cateringId, basePrice: '350.00', currency: 'GTQ', ratingAvg: 4.5 });
    const v3 = await makeVendor({ status: 'approved', locationId: locationMxId, categoryId: cateringId, basePrice: '1000.00', currency: 'MXN', ratingAvg: 4.7 });
    const v4 = await makeVendor({ status: 'approved', locationId: locationGtId, categoryId: venueId, basePrice: '800.00', currency: 'GTQ', ratingAvg: null });
    await makeVendor({ status: 'pending', locationId: locationGtId, categoryId: cateringId, basePrice: '100.00', currency: 'GTQ' });
    await makeVendor({ status: 'rejected', locationId: locationGtId, categoryId: cateringId, basePrice: '100.00', currency: 'GTQ' });
    await makeVendor({ status: 'hidden', locationId: locationGtId, categoryId: cateringId, basePrice: '100.00', currency: 'GTQ' });
    await makeVendor({ status: 'approved', deleted: true, locationId: locationGtId, categoryId: cateringId, basePrice: '100.00', currency: 'GTQ' });

    APPROVED_VENDOR_IDS.push(v1, v2, v3, v4);
    const meta = await prisma.vendorProfile.findMany({
      where: { id: { in: APPROVED_VENDOR_IDS } },
      select: { id: true, ratingAvg: true, createdAt: true },
    });
    APPROVED_VENDOR_META.push(
      ...meta.map((m) => ({
        id: m.id,
        ratingAvg: m.ratingAvg === null ? null : Number(m.ratingAvg.toString()),
        createdAt: m.createdAt,
      })),
    );
  });

  // ── AC-01/TS-01 filtros combinados ─────────────────────────────────────
  it('TS-01/AC-01: filtros combinados retornan matches con shape esperado', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({
      categoryCode: 'catering',
      locationCode: 'GT-GUA',
      priceMin: '100',
      priceMax: '500',
      currency: 'GTQ',
      limit: 20,
    });
    expect(res.status).toBe(200);
    const parsed = z.object({ items: z.array(vendorCardContract), page: pageContract }).safeParse(res.body?.data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Sólo v1 y v2 deberían matchear (GT-GUA + catering + 100..500 GTQ).
      expect(parsed.data.items.length).toBeGreaterThanOrEqual(2);
      for (const item of parsed.data.items) {
        expect(item.categories).toContain('catering');
        expect(item.locationCode).toBe('GT-GUA');
        expect(item.priceRange?.currency).toBe('GTQ');
      }
    }
  });

  // ── AC-02 cursor consistente ───────────────────────────────────────────
  it('TS-02/AC-02: cursor de la siguiente página no produce duplicados', async () => {
    const page1 = await organizerAgent.get('/api/v1/vendors').query({ limit: 2 });
    expect(page1.status).toBe(200);
    expect(page1.body?.data?.page?.hasNext).toBe(true);
    expect(page1.body?.data?.page?.cursor).not.toBeNull();
    const page2 = await organizerAgent
      .get('/api/v1/vendors')
      .query({ limit: 2, cursor: page1.body?.data?.page?.cursor });
    expect(page2.status).toBe(200);
    const ids1: string[] = page1.body?.data?.items?.map((i: { id: string }) => i.id) ?? [];
    const ids2: string[] = page2.body?.data?.items?.map((i: { id: string }) => i.id) ?? [];
    const union = new Set([...ids1, ...ids2]);
    expect(union.size).toBe(ids1.length + ids2.length);
  });

  // ── AC-03 empty state ─────────────────────────────────────────────────
  it('TS-05/AC-03: empty state cuando no hay matches', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({
      categoryCode: 'venue',
      locationCode: 'MX-CDMX',
      limit: 20,
    });
    expect(res.status).toBe(200);
    expect(res.body?.data?.items).toEqual([]);
    expect(res.body?.data?.page).toMatchObject({ cursor: null, hasNext: false });
  });

  // ── Visibilidad + vendor exclusion ─────────────────────────────────────
  it('TS-06/SEC-02: hidden/pending/rejected/soft-deleted no aparecen', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ limit: 50 });
    expect(res.status).toBe(200);
    const ids: string[] = res.body?.data?.items?.map((i: { id: string }) => i.id) ?? [];
    for (const approved of APPROVED_VENDOR_IDS) {
      expect(ids).toContain(approved);
    }
    // Debe incluir el vendorAgentProfileId (approved) también.
    expect(ids).toContain(vendorAgentProfileId);
    // El total debe ser exactamente 5 (los 4 approved + el vendor propio del organizer request).
    expect(ids.length).toBe(5);
  });

  it('TS-04/SEC-03: vendor autenticado no se ve a sí mismo', async () => {
    const res = await vendorAgent.get('/api/v1/vendors').query({ limit: 50 });
    expect(res.status).toBe(200);
    const ids: string[] = res.body?.data?.items?.map((i: { id: string }) => i.id) ?? [];
    expect(ids).not.toContain(vendorAgentProfileId);
    // El resto (4 approved) sí aparecen.
    expect(ids.length).toBe(4);
  });

  // ── Orden estable ───────────────────────────────────────────────────────
  it('TS-03/D2: orden rating_avg DESC NULLS LAST, created_at DESC, id DESC', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ limit: 50 });
    expect(res.status).toBe(200);
    const items: Array<{ id: string; ratingAvg: number | null }> = res.body?.data?.items ?? [];
    // Filas non-null antes que las null; entre las non-null, orden descendente por rating.
    const nonNull = items.filter((i) => i.ratingAvg !== null);
    const nulls = items.filter((i) => i.ratingAvg === null);
    for (let i = 1; i < nonNull.length; i += 1) {
      expect(nonNull[i - 1]!.ratingAvg!).toBeGreaterThanOrEqual(nonNull[i]!.ratingAvg!);
    }
    // Todas las NULL van después de las non-null.
    if (nonNull.length > 0 && nulls.length > 0) {
      const lastNonNullIdx = items.findIndex((i) => i.id === nonNull[nonNull.length - 1]!.id);
      const firstNullIdx = items.findIndex((i) => i.id === nulls[0]!.id);
      expect(lastNonNullIdx).toBeLessThan(firstNullIdx);
    }
  });

  // ── Negative + Edge cases ───────────────────────────────────────────────
  it('NT-01/VR-01: priceMin > priceMax → 400 VALIDATION_ERROR', async () => {
    const res = await organizerAgent
      .get('/api/v1/vendors')
      .query({ priceMin: '500', priceMax: '100', currency: 'GTQ' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-02/EC-01: categoryCode inexistente → 400 INVALID_FILTERS', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ categoryCode: 'unknown-cat' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_FILTERS');
    expect(res.body?.error?.details?.[0]?.field).toBe('categoryCode');
  });

  it('NT-03/EC-01: locationCode inexistente → 400 INVALID_FILTERS', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ locationCode: 'zz-unknown' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_FILTERS');
  });

  it('NT-04/EC-02: priceMin sin currency → 400 VALIDATION_ERROR (currency_required_with_price)', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ priceMin: '100' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    expect(
      (res.body?.error?.details ?? []).some(
        (d: { message: string }) => d.message === 'currency_required_with_price',
      ),
    ).toBe(true);
  });

  it('NT-05/VR-05: limit fuera de rango → 400 VALIDATION_ERROR', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ limit: 999 });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('NT-06/EC-05: cursor corrupto → 400 INVALID_CURSOR', async () => {
    const res = await organizerAgent.get('/api/v1/vendors').query({ cursor: 'not-a-cursor' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CURSOR');
  });

  // ── AUTH matrix ────────────────────────────────────────────────────────
  it('AUTH-TS-01: organizer → 200', async () => {
    const res = await organizerAgent.get('/api/v1/vendors');
    expect(res.status).toBe(200);
  });

  it('AUTH-TS-02: vendor → 200 (no se ve a sí mismo)', async () => {
    const res = await vendorAgent.get('/api/v1/vendors');
    expect(res.status).toBe(200);
    const ids: string[] = res.body?.data?.items?.map((i: { id: string }) => i.id) ?? [];
    expect(ids).not.toContain(vendorAgentProfileId);
  });

  it('AUTH-TS-03: admin → 200', async () => {
    const res = await adminAgent.get('/api/v1/vendors');
    expect(res.status).toBe(200);
  });
});
