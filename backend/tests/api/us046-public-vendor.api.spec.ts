// US-046 (PB-P1-029 / QA-002 + QA-003 + QA-005 + BE-006) — Tests HTTP end-to-end
// del perfil público SEO del vendor.
//   - DB-free: slug inválido → 400 VALIDATION_ERROR; 404 uniforme sin BD.
//   - DB-gated (skipIf): matriz de visibilidad por status (approved-visible vs.
//     pending/rejected/hidden/deleted → 404 uniforme, D6), whitelist mapper (SEC-02/03),
//     XSS-safety (bio con `<script>` no ejecuta — JSON escapa), cache headers en 200,
//     AUTH-TS-01/02 (anónimo y sesión reciben el mismo payload).
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
  `us046_${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@eventflow.test`;

// Contract (BE-006 smoke — response shape whitelist).
const publicVendorContract = z
  .object({
    slug: z.string(),
    businessName: z.string(),
    bio: z.string(),
    location: z.object({ display: z.string(), code: z.string().nullable() }).strict(),
    categories: z.array(z.object({ code: z.string(), name: z.string() }).strict()),
    ratingAvg: z.number().nullable(),
    reviewsCount: z.number().int().nonnegative(),
    reviewsTotalPublished: z.number().int().nonnegative(),
    packages: z.array(
      z
        .object({
          packageName: z.string(),
          basePrice: z.string(),
          currencyCode: z.string(),
          description: z.string(),
          serviceCategoryCode: z.string(),
        })
        .strict(),
    ),
    portfolio: z.array(
      z.object({ workLabel: z.string(), thumbnails: z.array(z.string()) }).strict(),
    ),
    reviews: z.array(
      z
        .object({
          rating: z.number().int(),
          comment: z.string().nullable(),
          createdAt: z.string(),
          reviewerDisplayName: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

describe('US-046 QA-002 (sin BD): validación defensiva del slug', () => {
  it('GET /public/vendors/BAD_SLUG → 400 VALIDATION_ERROR (mayúsculas)', async () => {
    const res = await request(app).get('/api/v1/public/vendors/BAD_SLUG');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /public/vendors/foo bar → 400 VALIDATION_ERROR (espacios)', async () => {
    const res = await request(app).get('/api/v1/public/vendors/foo%20bar');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /public/vendors/foo_bar → 400 VALIDATION_ERROR (underscore fuera del alfabeto)', async () => {
    const res = await request(app).get('/api/v1/public/vendors/foo_bar');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe.skipIf(!dbUp)('US-046 QA-002 (con BD): visibilidad + cache headers + whitelist', () => {
  let approvedSlug = '';
  let approvedNoReviewsSlug = '';
  let pendingSlug = '';
  let rejectedSlug = '';
  let hiddenSlug = '';
  let deletedSlug = '';

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
    if (role === 'vendor') payload.businessName = 'Vendor US046';
    else payload.name = `User US046 ${role}`;
    await agent.post('/api/v1/auth/register').send(payload);
    await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'Secret1234', captchaToken: CAPTCHA });
    return agent;
  }

  async function createVendor(opts: {
    status: 'approved' | 'pending' | 'rejected' | 'hidden';
    deleted?: boolean;
    bio?: string;
    ratingAvg?: number | null;
    reviewsCount?: number;
  }): Promise<{ slug: string; vendorProfileId: string }> {
    const agent = await agentFor('vendor');
    const cat = await prisma.serviceCategory.upsert({
      where: { code: 'catering' },
      update: { isActive: true, deletedAt: null },
      create: { code: 'catering', label: 'Catering', isActive: true, depthLevel: 1 },
    });
    const loc = await prisma.location.upsert({
      where: { code: 'GT-GUA' },
      update: {},
      create: { code: 'GT-GUA', country: 'Guatemala', region: 'Guatemala', city: 'Ciudad de Guatemala' },
    });
    const create = await agent.post('/api/v1/vendors/me').send({
      business_name: `Vendor US046 ${Math.floor(Math.random() * 1e9)}`,
      bio: opts.bio ?? 'Descripción de negocio con al menos cincuenta caracteres para pasar la validación básica.',
      location_id: loc.id,
      languages_supported: ['es-LATAM'],
      categories: [cat.id],
    });
    const profileId = create.body?.data?.id as string;
    await prisma.vendorProfile.update({
      where: { id: profileId },
      data: {
        status: opts.status,
        ratingAvg: opts.ratingAvg ?? null,
        reviewsCount: opts.reviewsCount ?? 0,
        deletedAt: opts.deleted ? new Date() : null,
      },
    });
    const row = await prisma.vendorProfile.findUnique({ where: { id: profileId } });
    return { slug: row!.slug!, vendorProfileId: profileId };
  }

  beforeAll(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE reviews, booking_intents, quotes, quote_requests, vendor_services, vendor_profile_categories, attachments, vendor_profiles, events, event_types, service_categories, locations, sessions, password_reset_tokens, admin_actions, users RESTART IDENTITY CASCADE`,
    );

    const approved = await createVendor({
      status: 'approved',
      ratingAvg: 4.75,
      reviewsCount: 2,
      bio: 'Bio segura con <script>alert(1)</script> tag literal — el JSON no ejecuta HTML.',
    });
    approvedSlug = approved.slug;

    // Package activo + inactivo (sólo el activo debe emitirse).
    const cat = await prisma.serviceCategory.findFirstOrThrow({ where: { code: 'catering' } });
    await prisma.vendorService.create({
      data: {
        vendorProfileId: approved.vendorProfileId,
        serviceCategoryId: cat.id,
        packageName: 'Menú clásico',
        description: 'Descripción de al menos diez caracteres.',
        basePrice: '250.00',
        currencyCode: 'GTQ',
        isActive: true,
      },
    });
    await prisma.vendorService.create({
      data: {
        vendorProfileId: approved.vendorProfileId,
        serviceCategoryId: cat.id,
        packageName: 'Paquete DESACTIVADO',
        description: 'No debe aparecer en la respuesta pública.',
        basePrice: '999.00',
        currencyCode: 'GTQ',
        isActive: false,
      },
    });

    // Reviews: 12 published + 1 hidden (sólo top 10 published deben salir; count total = 12).
    // Necesitamos un booking + author para respetar las FKs. `agentFor` registra al usuario
    // como side-effect; no requerimos el agent en sí (usamos Prisma directo abajo).
    await agentFor('organizer');
    const authorEmail = (await prisma.user.findFirst({
      where: { role: 'organizer' },
      orderBy: { createdAt: 'desc' },
    }))!.email;
    const author = await prisma.user.findUniqueOrThrow({ where: { email: authorEmail } });
    await prisma.user.update({
      where: { id: author.id },
      data: { fullName: 'Juan Pérez' },
    });
    // Booking intent stub — cadena mínima Event → QuoteRequest → Quote → BookingIntent (FKs
    // reales, respetamos el schema Prisma de US-095/US-096).
    const eventType = await prisma.eventType.upsert({
      where: { code: 'wedding' },
      update: {},
      create: { code: 'wedding', label: 'Boda', isActive: true },
    });
    const event = await prisma.event.create({
      data: {
        userId: author.id,
        eventTypeId: eventType.id,
        title: 'Evento US046',
        status: 'draft',
        currency: 'GTQ',
      },
    });
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        eventId: event.id,
        serviceCategoryId: cat.id,
        vendorProfileId: approved.vendorProfileId,
        status: 'sent',
      },
    });
    const quote = await prisma.quote.create({
      data: {
        quoteRequestId: quoteRequest.id,
        vendorProfileId: approved.vendorProfileId,
        amount: '250.00',
        currency: 'GTQ',
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });
    const bookingIntent = await prisma.bookingIntent.create({
      data: {
        quoteId: quote.id,
        eventId: event.id,
        serviceCategoryId: cat.id,
        vendorProfileId: approved.vendorProfileId,
        status: 'confirmed_intent',
        confirmedAt: new Date(),
      },
    });
    for (let i = 0; i < 12; i += 1) {
      await prisma.review.create({
        data: {
          bookingIntentId: bookingIntent.id,
          vendorProfileId: approved.vendorProfileId,
          authorId: author.id,
          rating: 5,
          comment: `Review pública #${i + 1}`,
          status: 'published',
          createdAt: new Date(Date.now() - i * 86400000),
        },
      });
      // author reuse: the same author reviewing multiple times is fine for the test
      // (`vendorProfileId + bookingIntentId` no UNIQUE constraint here).
    }
    await prisma.review.create({
      data: {
        bookingIntentId: bookingIntent.id,
        vendorProfileId: approved.vendorProfileId,
        authorId: author.id,
        rating: 1,
        comment: 'Review OCULTA — NO debe salir',
        status: 'hidden',
      },
    });

    // Portfolio: 2 workLabels con thumbnails activos + 1 attachment removed.
    await prisma.attachment.createMany({
      data: [
        {
          ownerType: 'vendor_work',
          ownerId: approved.vendorProfileId,
          status: 'active',
          url: 'https://cdn.test/1.jpg',
          workLabel: 'boda-clasica',
        },
        {
          ownerType: 'vendor_work',
          ownerId: approved.vendorProfileId,
          status: 'active',
          url: 'https://cdn.test/2.jpg',
          workLabel: 'boda-clasica',
        },
        {
          ownerType: 'vendor_work',
          ownerId: approved.vendorProfileId,
          status: 'active',
          url: 'https://cdn.test/3.jpg',
          workLabel: 'quince-anos',
        },
        {
          ownerType: 'vendor_work',
          ownerId: approved.vendorProfileId,
          status: 'deleted',
          url: 'https://cdn.test/removed.jpg',
          workLabel: 'boda-clasica',
        },
      ],
    });

    approvedNoReviewsSlug = (await createVendor({ status: 'approved', ratingAvg: null, reviewsCount: 0 })).slug;
    pendingSlug = (await createVendor({ status: 'pending' })).slug;
    rejectedSlug = (await createVendor({ status: 'rejected' })).slug;
    hiddenSlug = (await createVendor({ status: 'hidden' })).slug;
    deletedSlug = (await createVendor({ status: 'approved', deleted: true })).slug;
  });

  it('AC-01 · vendor approved → 200 con shape whitelist (BE-006 smoke)', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    expect(res.status).toBe(200);
    const parsed = publicVendorContract.safeParse(res.body?.data);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.log(parsed.error.format());
    }
    expect(parsed.success).toBe(true);
    // AC-04 · Cache-Control header presente en 200.
    expect(res.headers['cache-control']).toBe('public, max-age=60, stale-while-revalidate=300');
  });

  it('AC-03 · limita a 10 reviews published + reporta count total = 12', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    const reviews = res.body?.data?.reviews as Array<{ comment: string | null }>;
    expect(reviews).toHaveLength(10);
    expect(res.body?.data?.reviewsTotalPublished).toBe(12);
    for (const r of reviews) {
      expect(r.comment ?? '').not.toContain('OCULTA');
    }
  });

  it('SEC-02/03 · whitelist — no expone email/phone/IDs internos ni packages inactivos', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/@eventflow\.test/); // email
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toMatch(/DESACTIVADO/); // package inactivo
    expect(raw).not.toMatch(/deleted_at|deletedAt/);
    expect(res.body?.data).not.toHaveProperty('id');
    expect(res.body?.data).not.toHaveProperty('userId');
  });

  it('SEC-06 · XSS defense — bio con `<script>` viaja como texto literal', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    expect(res.body?.data?.bio).toContain('<script>');
    // El JSON no interpreta HTML — la ejecución depende del renderer (Next.js auto-escape).
    expect(typeof res.body?.data?.bio).toBe('string');
  });

  it('AC-01 · portfolio agrupado por workLabel + attachments removed omitidos', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    const groups = res.body?.data?.portfolio as Array<{ workLabel: string; thumbnails: string[] }>;
    expect(groups.map((g) => g.workLabel).sort()).toEqual(['boda-clasica', 'quince-anos']);
    const boda = groups.find((g) => g.workLabel === 'boda-clasica')!;
    expect(boda.thumbnails).toHaveLength(2);
    expect(boda.thumbnails).not.toContain('https://cdn.test/removed.jpg');
  });

  it('AC-02 / D6 · pending/rejected/hidden/soft-deleted → 404 uniforme VENDOR_NOT_FOUND', async () => {
    for (const slug of [pendingSlug, rejectedSlug, hiddenSlug, deletedSlug, 'slug-que-no-existe']) {
      const res = await request(app).get(`/api/v1/public/vendors/${slug}`);
      expect(res.status, `slug=${slug}`).toBe(404);
      expect(res.body?.error?.code).toBe('VENDOR_NOT_FOUND');
      // 404 no debe llevar Cache-Control positivo (evita cachear una desaparición en CDN).
      expect(res.headers['cache-control']).toBeUndefined();
    }
  });

  it('AC-01 · vendor approved sin reviews emite ratingAvg=null y reviews=[]', async () => {
    const res = await request(app).get(`/api/v1/public/vendors/${approvedNoReviewsSlug}`);
    expect(res.status).toBe(200);
    expect(res.body?.data?.ratingAvg).toBeNull();
    expect(res.body?.data?.reviewsCount).toBe(0);
    expect(res.body?.data?.reviewsTotalPublished).toBe(0);
    expect(res.body?.data?.reviews).toEqual([]);
  });

  it('AUTH-TS-01/02 · anónimo y sesión reciben el mismo payload (endpoint público)', async () => {
    const anon = await request(app).get(`/api/v1/public/vendors/${approvedSlug}`);
    const auth = await agentFor('organizer');
    const withSession = await auth.get(`/api/v1/public/vendors/${approvedSlug}`);
    expect(anon.status).toBe(200);
    expect(withSession.status).toBe(200);
    // Igualamos comparando el DTO — el meta.correlationId cambia por request, no debe compararse.
    expect(withSession.body?.data).toEqual(anon.body?.data);
  });
});
