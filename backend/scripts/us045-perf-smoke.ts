// US-045 QA-004 — Performance smoke del directorio autenticado (`GET /api/v1/vendors`).
//
// Objetivo: reportar p95 < 1s con N vendors aprobados (NFR-PERF-001). No corre en CI ni en la
// suite de tests; se invoca ad-hoc contra una BD de dev sembrada:
//   PERF_VENDOR_COUNT=1000 npx tsx scripts/us045-perf-smoke.ts
//
// Estrategia — determinista, idempotente y aislado:
//   1. Crea 1 usuario "perf-owner" reutilizable.
//   2. Upsert de 1 location + 1 category si no existen.
//   3. Semilla `PERF_VENDOR_COUNT` vendors aprobados vivos con timestamps escalonados
//      (para keyset). NO borra datos preexistentes.
//   4. Mide 100 invocaciones al use case directamente (sin HTTP), reporta p50 / p95 / p99.
//
// Si necesitás medir el request HTTP completo, usá `ab`/`k6` contra el proceso ya arrancado —
// esto sólo cubre la parte de aplicación (query + mapping) que es donde vive el riesgo real.
import { PrismaClient } from '@prisma/client';
import { PrismaVendorSearchRepository } from '../src/modules/vendor-management/infrastructure/prisma-vendor-search.repository.js';
import {
  PrismaLocationSlugResolver,
  PrismaServiceCategorySlugResolver,
} from '../src/modules/vendor-management/infrastructure/prisma-vendor-search-resolvers.js';
import { SearchVendorsUseCase } from '../src/modules/vendor-management/application/search-vendors.use-case.js';

const N = Number(process.env.PERF_VENDOR_COUNT ?? '1000');
const RUNS = Number(process.env.PERF_RUNS ?? '100');

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const repo = new PrismaVendorSearchRepository(prisma);
  const catResolver = new PrismaServiceCategorySlugResolver(prisma);
  const locResolver = new PrismaLocationSlugResolver(prisma);
  const uc = new SearchVendorsUseCase(repo, catResolver, locResolver);

  // Ensure supporting rows.
  const location = await prisma.location.upsert({
    where: { code: 'PERF-LOC' },
    update: {},
    create: { code: 'PERF-LOC', country: 'PerfLand', region: 'PerfRegion', city: 'PerfCity' },
  });
  const category = await prisma.serviceCategory.upsert({
    where: { code: 'perf-cat' },
    update: { isActive: true, deletedAt: null },
    create: { code: 'perf-cat', label: 'Perf Category', depthLevel: 1, isActive: true },
  });
  const existing = await prisma.vendorProfile.count({
    where: {
      deletedAt: null,
      status: 'approved',
      businessName: { startsWith: 'Perf Vendor' },
    },
  });
  const needed = Math.max(0, N - existing);
  if (needed > 0) {
    process.stdout.write(`Seeding ${needed} approved vendors…\n`);
    const now = Date.now();
    for (let i = 0; i < needed; i += 1) {
      const created = new Date(now - i * 1000);
      // Cada VendorProfile requiere un user distinto (UNIQUE userId). Usamos `upsert` por email
      // para permitir reintentos idempotentes; el email codifica el índice `i`.
      const email = `perf-user-${existing + i}@seed.eventflow.test`;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: '$argon2id$v=19$m=64,t=1,p=1$c2FsdA$perfhash',
          fullName: `Perf User ${existing + i}`,
          role: 'vendor',
          status: 'active',
          preferredLanguage: 'es_LATAM',
        },
      });
      const vp = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          businessName: `Perf Vendor ${existing + i}`,
          slug: `perf-vendor-${existing + i}-${now}`,
          bio: 'Perf smoke seed row.',
          languagesSupported: ['es-LATAM'],
          status: 'approved',
          locationId: location.id,
          categoryChangeCount: 0,
          ratingAvg: Math.round(Math.random() * 500) / 100,
          reviewsCount: Math.floor(Math.random() * 50),
          createdAt: created,
        },
      });
      // Todas las filas quedan filtrables por category + price.
      await prisma.vendorProfileCategory
        .create({ data: { vendorProfileId: vp.id, serviceCategoryId: category.id } })
        .catch(() => undefined);
      await prisma.vendorService
        .create({
          data: {
            vendorProfileId: vp.id,
            serviceCategoryId: category.id,
            packageName: `Perf Package ${existing + i}`,
            description: 'Perf smoke seed service.',
            basePrice: 100 + (i % 500),
            currencyCode: 'GTQ',
            isActive: true,
          },
        })
        .catch(() => undefined);
    }
  }

  process.stdout.write(`Running ${RUNS} search executions…\n`);
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const t0 = process.hrtime.bigint();
    await uc.execute({
      currentUser: { id: 'perf-organizer-id', role: 'organizer' },
      query: {
        categoryCode: 'perf-cat',
        locationCode: 'PERF-LOC',
        priceMin: '100',
        priceMax: '600',
        currency: 'GTQ',
        limit: 20,
      },
    });
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const p = (q: number): number => sorted[Math.floor(sorted.length * q)] ?? 0;
  process.stdout.write(`Vendors approved live: ~${await prisma.vendorProfile.count({ where: { status: 'approved', deletedAt: null } })}\n`);
  process.stdout.write(`p50=${p(0.5).toFixed(1)} ms  p95=${p(0.95).toFixed(1)} ms  p99=${p(0.99).toFixed(1)} ms\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
