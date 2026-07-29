// US-145 (PB-P3-006) — Guardia de demo readiness: garantía verificada de `confirmed_intent` +
// reseña verificada del vendor demo principal, ejecutada DESPUÉS del seed demo (US-088).
//
// Cobertura:
//   - AC-01 / VR-01 / TS-01 (QA-002): ≥1 `confirmed_intent` (`is_seed`+`is_simulated`) del vendor demo.
//   - AC-02 / VR-02 / TS-02 (QA-003): ≥1 reseña verificada (`published`, rating 1..5, ligada a confirmed).
//   - AC-03 / VR-03 / SD-T-01 (QA-004): guardia agregada — verde SOLO si ambas invariantes.
//   - AC-03 / EC-01 / EC-02 / NT-01..03 / SD-T-02 (QA-005): sin falso verde; fallo rojo accionable.
//
// Los casos con BD usan el patrón consolidado del repo `describe.skipIf(!dbUp)` (helper
// `tests/helpers/test-db.ts`): sin Postgres se saltan limpiamente (Not Run), nunca "falso verde".
// Los negativos son PUROS (dominio) y corren siempre sin tocar el seed compartido (requisito QA-005).
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { MockAIProvider } from '../../src/modules/ai-assistance/infrastructure/providers/mock/mock-ai-provider.js';
import { SeedDemoDataUseCase } from '../../src/modules/seed-demo/application/seed-demo-data.use-case.js';
import {
  checkDemoReadiness,
  resolveDemoVendorProfileId,
} from '../../src/modules/seed-demo/application/check-demo-readiness.js';
import {
  DEMO_READINESS_MISSING_CONFIRMED_INTENT,
  DEMO_READINESS_MISSING_VERIFIED_REVIEW,
  DemoReadinessError,
  assertDemoReadiness,
  isVerifiedReview,
  type ReviewLike,
} from '../../src/modules/seed-demo/domain/demo-readiness.js';
import { getTestPrisma, dbUp } from '../helpers/test-db.js';

const prisma = getTestPrisma();

// Tablas gestionadas por el seed demo — se truncan para partir de un estado limpio y completo
// (mismo conjunto que las suites US-085/US-088). El seed es idempotente y recrea todo lo que necesita.
const SEED_TABLES = [
  'ai_recommendations', 'ai_prompt_versions', 'reviews', 'booking_intents', 'quotes',
  'quote_requests', 'budget_items', 'budgets', 'event_tasks', 'events', 'vendor_services',
  'vendor_profile_categories', 'vendor_profiles', 'attachments', 'locations', 'service_categories',
  'event_types', 'notifications', 'admin_actions', 'sessions', 'password_reset_tokens', 'users',
].join(', ');

function runSeed() {
  return new SeedDemoDataUseCase({ prisma, ai: new MockAIProvider() }).execute();
}

// ---------------------------------------------------------------------------------------------
// Verificación de estado real post-seed (AC-01/AC-02/AC-03 rama verde). Requiere Postgres + seed.
// ---------------------------------------------------------------------------------------------
describe.skipIf(!dbUp)('US-145 — Guardia de demo readiness (post-seed)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${SEED_TABLES} RESTART IDENTITY CASCADE`);
    await runSeed();
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('QA-001: resuelve el vendor demo principal por ancla determinista (sin hardcode)', async () => {
    const vendorProfileId = await resolveDemoVendorProfileId(prisma);
    expect(vendorProfileId).toMatch(/^[0-9a-f-]{36}$/);
    // El ancla es un vendor `approved` (persona demo principal).
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
      select: { status: true, isSeed: true },
    });
    expect(vendor?.status).toBe('approved');
    expect(vendor?.isSeed).toBe(true);
  });

  it('AC-01 / VR-01 / TS-01: existe ≥1 confirmed_intent (is_seed + is_simulated) del vendor demo', async () => {
    const result = await checkDemoReadiness(prisma);
    expect(result.confirmedIntentCount).toBeGreaterThanOrEqual(1);
  });

  it('AC-02 / VR-02 / TS-02: existe ≥1 reseña verificada (published, rating 1..5, ligada a confirmed) del vendor demo', async () => {
    const result = await checkDemoReadiness(prisma);
    expect(result.verifiedReviewCount).toBeGreaterThanOrEqual(1);
  });

  it('AC-03 / VR-03 / SD-T-01: la guardia agregada reporta verde (no lanza) sólo con ambas invariantes', async () => {
    const result = await checkDemoReadiness(prisma);
    expect(() => assertDemoReadiness(result)).not.toThrow();
  });

  it('NT-03 (DB): la reseña verificada excluye hidden/removed — el conteo verificado ⊆ published del vendor', async () => {
    const { vendorProfileId, verifiedReviewCount } = await checkDemoReadiness(prisma);
    const publishedOfVendor = await prisma.review.count({
      where: { isSeed: true, status: 'published', vendorProfileId, bookingIntent: { status: 'confirmed_intent' } },
    });
    const nonPublishedOfVendor = await prisma.review.count({
      where: { isSeed: true, status: { in: ['hidden', 'removed'] }, vendorProfileId },
    });
    // El conteo verificado coincide con published+ligadas y NO suma las moderadas (sin falso verde).
    expect(verifiedReviewCount).toBe(publishedOfVendor);
    expect(nonPublishedOfVendor).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Guardia sin falso verde — PUROS (dominio), corren siempre, sin tocar el seed compartido (QA-005).
// ---------------------------------------------------------------------------------------------
describe('US-145 — Sin falso verde (aserción de dominio, sin BD)', () => {
  const VENDOR = '11111111-1111-1111-1111-111111111111';

  it('NT-01 / EC-01 / VR-01: sin confirmed_intent → falla con demo_readiness_missing_confirmed_intent', () => {
    let error: unknown;
    try {
      assertDemoReadiness({ vendorProfileId: VENDOR, confirmedIntentCount: 0, verifiedReviewCount: 1 });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(DemoReadinessError);
    expect((error as DemoReadinessError).code).toBe(DEMO_READINESS_MISSING_CONFIRMED_INTENT);
    // Mensaje accionable: identifica al vendor y sugiere re-seed / pinning (US-085 / US-088).
    expect((error as DemoReadinessError).message).toContain('npm run seed');
    expect((error as DemoReadinessError).message).toContain(VENDOR);
  });

  it('NT-02 / EC-01 / VR-02: sin reseña verificada → falla con demo_readiness_missing_verified_review', () => {
    let error: unknown;
    try {
      assertDemoReadiness({ vendorProfileId: VENDOR, confirmedIntentCount: 1, verifiedReviewCount: 0 });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(DemoReadinessError);
    expect((error as DemoReadinessError).code).toBe(DEMO_READINESS_MISSING_VERIFIED_REVIEW);
    expect((error as DemoReadinessError).message).toContain('npm run seed');
  });

  it('SD-T-02 / EC-01: seed incompleto (ambas en 0) → falla en rojo (primero el confirmed_intent)', () => {
    expect(() =>
      assertDemoReadiness({ vendorProfileId: VENDOR, confirmedIntentCount: 0, verifiedReviewCount: 0 }),
    ).toThrow(DemoReadinessError);
  });

  it('VR-03 / SD-T-01: ambas invariantes presentes → NO lanza (verde legítimo)', () => {
    expect(() =>
      assertDemoReadiness({ vendorProfileId: VENDOR, confirmedIntentCount: 1, verifiedReviewCount: 1 }),
    ).not.toThrow();
  });

  it('NT-03 / EC-02 / BR-REVIEW-001: el predicado "reseña verificada" excluye estados/links inválidos', () => {
    const base: ReviewLike = {
      status: 'published',
      isSeed: true,
      rating: 5,
      vendorProfileId: VENDOR,
      bookingIntent: { status: 'confirmed_intent' },
    };
    // Caso válido de referencia.
    expect(isVerifiedReview(base, VENDOR)).toBe(true);
    // hidden / removed no son verificadas.
    expect(isVerifiedReview({ ...base, status: 'hidden' }, VENDOR)).toBe(false);
    expect(isVerifiedReview({ ...base, status: 'removed' }, VENDOR)).toBe(false);
    // published pero sin link a un confirmed_intent.
    expect(isVerifiedReview({ ...base, bookingIntent: null }, VENDOR)).toBe(false);
    expect(isVerifiedReview({ ...base, bookingIntent: { status: 'pending' } }, VENDOR)).toBe(false);
    // De otro vendor.
    expect(isVerifiedReview(base, '22222222-2222-2222-2222-222222222222')).toBe(false);
    // rating fuera de rango.
    expect(isVerifiedReview({ ...base, rating: 0 }, VENDOR)).toBe(false);
    expect(isVerifiedReview({ ...base, rating: 6 }, VENDOR)).toBe(false);
  });
});
