// Directorio público de vendors — `GET /api/v1/public/vendors`.
//
// Contrapartida del perfil público por slug (US-046): misma superficie anónima, mismo shape que
// el directorio autenticado (US-045) y la misma definición de «vendor visible».
//
//   - DB-free: anónimo NO recibe 401 (es lo que lo distingue de `GET /vendors`); validación de
//     filtros y cursor sin necesidad de BD.
//   - DB-gated (skipIf): matriz de visibilidad por status, filtros, paginación por cursor,
//     cache headers y equivalencia de payload con el directorio autenticado.
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
  `pubdir_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

const PATH = '/api/v1/public/vendors';

// Whitelist del contrato público: exactamente los mismos campos que el directorio autenticado.
// `.strict()` es lo que impide que un cambio futuro filtre un campo nuevo sin decidirlo.
const vendorCardContract = z
  .object({
    id: z.string().uuid(),
    slug: z.string(),
    businessName: z.string(),
    locationCode: z.string().nullable(),
    categories: z.array(z.string()),
    ratingAvg: z.number().nullable(),
    reviewsCount: z.number().int().nonnegative(),
    priceRange: z
      .object({ min: z.string(), max: z.string(), currency: z.string() })
      .strict()
      .nullable(),
    thumbnailUrl: z.string().nullable(),
  })
  .strict();

const pageContract = z
  .object({
    cursor: z.string().nullable(),
    limit: z.number().int().positive(),
    hasNext: z.boolean(),
  })
  .strict();

async function vendorAgent(): Promise<ReturnType<typeof request.agent>> {
  const email = uniq('vendor');
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/register').send({
    acceptedTerms: true,
    email,
    password: 'Secret1234',
    role: 'vendor',
    businessName: 'Vendor Public Directory',
    captchaToken: CAPTCHA,
  });
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
  return agent;
}

describe('directorio público (sin BD): es público y valida sus filtros', () => {
  it('no exige sesión — a diferencia de `GET /vendors`', async () => {
    const anonymous = await request(app).get(PATH);
    expect(anonymous.status).not.toBe(401);

    // El autenticado sigue cerrado: este endpoint no lo sustituye ni lo abre.
    const authenticated = await request(app).get('/api/v1/vendors');
    expect(authenticated.status).toBe(401);
    expect(authenticated.body?.error?.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rechaza un cursor corrupto sin filtrar detalle interno', async () => {
    const res = await request(app)
      .get(PATH)
      .query({ cursor: 'not-a-valid-cursor!!!' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_CURSOR');
  });

  it('rechaza un parámetro desconocido (schema estricto)', async () => {
    const res = await request(app).get(PATH).query({ nope: 'x' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('exige `currency` cuando se filtra por precio', async () => {
    const res = await request(app).get(PATH).query({ priceMin: '100.00' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza `limit` fuera de rango', async () => {
    expect((await request(app).get(PATH).query({ limit: 0 })).status).toBe(400);
    expect((await request(app).get(PATH).query({ limit: 51 })).status).toBe(
      400,
    );
  });
});

describe.skipIf(!dbUp)('directorio público (con BD)', () => {
  let locationGtId = '';
  let locationMxId = '';
  let cateringId = '';
  let venueId = '';
  const APPROVED_IDS: string[] = [];
  const HIDDEN_IDS: string[] = [];

  async function createProfile(
    agent: ReturnType<typeof request.agent>,
    categoryId: string,
    locationId: string,
  ): Promise<string> {
    const res = await agent.post('/api/v1/vendors/me').send({
      business_name: `Vendor PubDir ${Math.floor(Math.random() * 1e6)}`,
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
        data: {
          code: 'GT-GUA',
          country: 'Guatemala',
          region: 'Guatemala',
          city: 'Ciudad de Guatemala',
        },
      })
    ).id;
    locationMxId = (
      await prisma.location.create({
        data: {
          code: 'MX-CDMX',
          country: 'México',
          region: 'CDMX',
          city: 'Ciudad de México',
        },
      })
    ).id;

    cateringId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'catering' },
        update: { isActive: true, deletedAt: null },
        create: {
          code: 'catering',
          label: 'Catering',
          isActive: true,
          depthLevel: 1,
        },
      })
    ).id;
    venueId = (
      await prisma.serviceCategory.upsert({
        where: { code: 'venue' },
        update: { isActive: true, deletedAt: null },
        create: {
          code: 'venue',
          label: 'Venue',
          isActive: true,
          depthLevel: 1,
        },
      })
    ).id;

    async function makeVendor(opts: {
      status: 'approved' | 'pending' | 'rejected' | 'hidden';
      deleted?: boolean;
      locationId: string;
      categoryId: string;
      basePrice: string;
      currency: 'GTQ' | 'MXN';
      ratingAvg?: number | null;
    }): Promise<string> {
      const agent = await vendorAgent();
      const profileId = await createProfile(
        agent,
        opts.categoryId,
        opts.locationId,
      );
      await prisma.vendorProfile.update({
        where: { id: profileId },
        data: {
          status: opts.status,
          ratingAvg: opts.ratingAvg ?? null,
          reviewsCount:
            opts.ratingAvg === undefined || opts.ratingAvg === null ? 0 : 5,
          deletedAt: opts.deleted ? new Date() : null,
        },
      });
      await prisma.vendorService.create({
        data: {
          vendorProfileId: profileId,
          serviceCategoryId: opts.categoryId,
          packageName: 'Paquete Demo',
          description:
            'Descripción de al menos diez caracteres para el paquete demo.',
          basePrice: opts.basePrice,
          currencyCode: opts.currency,
          isActive: true,
        },
      });
      return profileId;
    }

    const v1 = await makeVendor({
      status: 'approved',
      locationId: locationGtId,
      categoryId: cateringId,
      basePrice: '200.00',
      currency: 'GTQ',
      ratingAvg: 4.9,
    });
    const v2 = await makeVendor({
      status: 'approved',
      locationId: locationGtId,
      categoryId: cateringId,
      basePrice: '350.00',
      currency: 'GTQ',
      ratingAvg: 4.5,
    });
    const v3 = await makeVendor({
      status: 'approved',
      locationId: locationMxId,
      categoryId: cateringId,
      basePrice: '1000.00',
      currency: 'MXN',
      ratingAvg: 4.7,
    });
    const v4 = await makeVendor({
      status: 'approved',
      locationId: locationGtId,
      categoryId: venueId,
      basePrice: '800.00',
      currency: 'GTQ',
      ratingAvg: null,
    });
    APPROVED_IDS.push(v1, v2, v3, v4);

    HIDDEN_IDS.push(
      await makeVendor({
        status: 'pending',
        locationId: locationGtId,
        categoryId: cateringId,
        basePrice: '100.00',
        currency: 'GTQ',
      }),
      await makeVendor({
        status: 'rejected',
        locationId: locationGtId,
        categoryId: cateringId,
        basePrice: '100.00',
        currency: 'GTQ',
      }),
      await makeVendor({
        status: 'hidden',
        locationId: locationGtId,
        categoryId: cateringId,
        basePrice: '100.00',
        currency: 'GTQ',
      }),
      await makeVendor({
        status: 'approved',
        deleted: true,
        locationId: locationGtId,
        categoryId: cateringId,
        basePrice: '100.00',
        currency: 'GTQ',
      }),
    );
  }, 120_000);

  it('un visitante anónimo obtiene los vendors aprobados', async () => {
    const res = await request(app).get(PATH);
    expect(res.status).toBe(200);

    const ids = (res.body?.data?.items as Array<{ id: string }>).map(
      (v) => v.id,
    );
    for (const approved of APPROVED_IDS) expect(ids).toContain(approved);
    expect(ids).toHaveLength(APPROVED_IDS.length);
  });

  it('no expone vendors pending, rejected, hidden ni borrados', async () => {
    const res = await request(app).get(PATH).query({ limit: 50 });
    const ids = (res.body?.data?.items as Array<{ id: string }>).map(
      (v) => v.id,
    );
    for (const invisible of HIDDEN_IDS) {
      expect(
        ids,
        `un vendor no publicable se filtró: ${invisible}`,
      ).not.toContain(invisible);
    }
  });

  it('respeta el contrato de campos públicos, sin filtrar ninguno extra', async () => {
    const res = await request(app).get(PATH);
    const parsed = z
      .object({ items: z.array(vendorCardContract), page: pageContract })
      .strict()
      .safeParse(res.body?.data);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('no incluye datos de contacto ni identificadores de usuario', async () => {
    const res = await request(app).get(PATH);
    const raw = JSON.stringify(res.body);
    for (const leak of [
      'email',
      'phone',
      'userId',
      'user_id',
      'passwordHash',
      'deletedAt',
    ]) {
      expect(
        raw,
        `campo sensible en la respuesta pública: ${leak}`,
      ).not.toContain(leak);
    }
  });

  it('filtra por categoría y por ubicación', async () => {
    const byCategory = await request(app)
      .get(PATH)
      .query({ categoryCode: 'venue' });
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data.items).toHaveLength(1);

    const byLocation = await request(app)
      .get(PATH)
      .query({ locationCode: 'MX-CDMX' });
    expect(byLocation.status).toBe(200);
    expect(byLocation.body.data.items).toHaveLength(1);
    expect(byLocation.body.data.items[0].locationCode).toBe('MX-CDMX');
  });

  it('filtra por rango de precio en la moneda indicada', async () => {
    const res = await request(app)
      .get(PATH)
      .query({ priceMin: '100.00', priceMax: '300.00', currency: 'GTQ' });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].priceRange.currency).toBe('GTQ');
  });

  it('rechaza un slug de filtro inexistente enumerando los inválidos', async () => {
    const res = await request(app)
      .get(PATH)
      .query({ categoryCode: 'no-existe', locationCode: 'tampoco' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_FILTERS');
    // El envelope lista todos los filtros inválidos a la vez (D3 strict), no sólo el primero.
    const fields = (res.body?.error?.details as Array<{ field: string }>).map(
      (d) => d.field,
    );
    expect(fields).toEqual(
      expect.arrayContaining(['categoryCode', 'locationCode']),
    );
  });

  it('pagina con cursor sin repetir ni perder elementos', async () => {
    const first = await request(app).get(PATH).query({ limit: 2 });
    expect(first.status).toBe(200);
    expect(first.body.data.items).toHaveLength(2);
    expect(first.body.data.page.hasNext).toBe(true);

    const second = await request(app)
      .get(PATH)
      .query({ limit: 2, cursor: first.body.data.page.cursor });
    expect(second.status).toBe(200);

    const firstIds = (first.body.data.items as Array<{ id: string }>).map(
      (v) => v.id,
    );
    const secondIds = (second.body.data.items as Array<{ id: string }>).map(
      (v) => v.id,
    );
    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
    expect(new Set([...firstIds, ...secondIds]).size).toBe(APPROVED_IDS.length);
  });

  it('declara Cache-Control: es contenido público y cacheable', async () => {
    const res = await request(app).get(PATH);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
  });

  it('el visitante anónimo ve lo mismo que un organizer autenticado', async () => {
    const email = uniq('organizer');
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      acceptedTerms: true,
      email,
      password: 'Secret1234',
      role: 'organizer',
      name: 'Organizer PubDir',
      captchaToken: CAPTCHA,
    });
    await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });

    const anonymous = await request(app).get(PATH).query({ limit: 50 });
    const authenticated = await agent
      .get('/api/v1/vendors')
      .query({ limit: 50 });

    expect(anonymous.status).toBe(200);
    expect(authenticated.status).toBe(200);
    expect(anonymous.body.data.items).toEqual(authenticated.body.data.items);
  });
});
