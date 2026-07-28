// US-145 (PB-P3-006) — Lectura del estado real post-seed para la guardia de demo readiness.
//
// Solo lectura: resuelve el vendor demo principal por ancla determinista de seed y cuenta las dos
// invariantes demo-críticas (VR-01 confirmed_intent, VR-02 reseña verificada). NO muta estado, NO
// reimplementa fixtures (propiedad de US-088), NO introduce use cases de negocio (Tech Spec §7/§18).
import type { PrismaClient } from '@prisma/client';
import { DEMO_VENDOR_ANCHOR_EMAIL, type DemoReadinessResult } from '../domain/demo-readiness.js';

/**
 * Fallo al resolver el ancla del vendor demo principal (seed ausente/incompleto). Es una condición
 * de "sin falso verde" también en el setup: si el vendor demo no existe, la verificación no puede
 * reportar verde (EC-01).
 */
export class DemoVendorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoVendorNotFoundError';
  }
}

/**
 * Resuelve el `vendor_profile_id` del vendor demo principal vía ancla determinista de seed
 * (`DEMO_VENDOR_ANCHOR_EMAIL` → primer vendor `approved` de US-085/US-088), sin hardcode frágil.
 */
export async function resolveDemoVendorProfileId(prisma: PrismaClient): Promise<string> {
  const vendor = await prisma.vendorProfile.findFirst({
    where: { isSeed: true, user: { email: DEMO_VENDOR_ANCHOR_EMAIL } },
    select: { id: true },
  });
  if (!vendor) {
    throw new DemoVendorNotFoundError(
      `demo_readiness_vendor_not_found: no se encontró el vendor demo principal ` +
        `(ancla ${DEMO_VENDOR_ANCHOR_EMAIL}). Ejecuta el seed ('npm run seed', US-085) antes de verificar.`,
    );
  }
  return vendor.id;
}

/**
 * Lee el estado real post-seed (solo lectura) y devuelve los conteos de las dos invariantes
 * demo-críticas para el vendor demo principal:
 *   - VR-01: `BookingIntent` 'confirmed_intent' (`is_seed` + `is_simulated`).
 *   - VR-02: `Review` 'published' (`is_seed`, `rating 1..5`) ligada a un 'confirmed_intent' del vendor.
 *
 * La composición de conteos con la aserción sin falso verde (`assertDemoReadiness`) vive en el
 * dominio; esta función solo aporta los datos observados.
 */
export async function checkDemoReadiness(prisma: PrismaClient): Promise<DemoReadinessResult> {
  const vendorProfileId = await resolveDemoVendorProfileId(prisma);
  const [confirmedIntentCount, verifiedReviewCount] = await Promise.all([
    prisma.bookingIntent.count({
      where: { status: 'confirmed_intent', isSeed: true, isSimulated: true, vendorProfileId },
    }),
    prisma.review.count({
      where: {
        status: 'published',
        isSeed: true,
        rating: { gte: 1, lte: 5 },
        vendorProfileId,
        bookingIntent: { status: 'confirmed_intent' },
      },
    }),
  ]);
  return { vendorProfileId, confirmedIntentCount, verifiedReviewCount };
}
