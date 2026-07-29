// US-145 (PB-P3-006) — Guardia de demo readiness (dominio puro, solo lectura, sin Prisma).
//
// Define la semántica invariante de la garantía demo-crítica para el vendor demo principal:
//   VR-01: ≥1 `BookingIntent.confirmed_intent` (`is_seed` + `is_simulated`).
//   VR-02: ≥1 `Review` verificada — `published` + `is_seed` + `rating 1..5` + ligada a un
//          `confirmed_intent` del mismo vendor (BR-REVIEW-001 / BR-REVIEW-003 / BR-SEED-007).
// y la aserción "sin falso verde" (VR-03 / AC-03): verde SOLO si ambas invariantes se cumplen.
//
// La lectura del estado real post-seed vive en la capa application (`check-demo-readiness.ts`).
// Aquí no se importa Prisma: mantiene la semántica testeable de forma pura y determinista, lo que
// habilita los tests negativos (NT-01..03, SD-T-02) sin mutar el seed compartido de US-088.

/**
 * Ancla determinista del vendor demo principal = primer vendor `approved` del seed (US-085/US-088).
 * Corresponde a `seedEmail('vendor', 0)` (ver `seed-key.ts`). Se usa como referencia estable en
 * lugar de un `vendor_profile_id` literal (mitiga el riesgo "resolución frágil", Tech Spec §17).
 */
export const DEMO_VENDOR_ANCHOR_EMAIL = 'vendor0@seed.eventflow.test';

/** Identificador de fallo cuando falta el `confirmed_intent` del vendor demo (AC-03 / EC-01). */
export const DEMO_READINESS_MISSING_CONFIRMED_INTENT = 'demo_readiness_missing_confirmed_intent';

/** Identificador de fallo cuando falta la reseña verificada del vendor demo (AC-03 / EC-01). */
export const DEMO_READINESS_MISSING_VERIFIED_REVIEW = 'demo_readiness_missing_verified_review';

/** Forma mínima de una reseña para evaluar el predicado "verificada" (solo lectura). */
export interface ReviewLike {
  status: string;
  isSeed: boolean;
  rating: number;
  vendorProfileId: string;
  bookingIntent: { status: string } | null;
}

/**
 * Predicado puro "reseña verificada" (BR-REVIEW-001): `published` + `is_seed` + `rating ∈ 1..5`
 * + del vendor dado + ligada a un `BookingIntent` en `confirmed_intent`. Excluye `hidden`/`removed`
 * y reseñas sin link a un `confirmed_intent` (EC-02 / NT-03) — evita el "falso verde" por criterio laxo.
 */
export function isVerifiedReview(review: ReviewLike, vendorProfileId: string): boolean {
  return (
    review.status === 'published' &&
    review.isSeed === true &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    review.vendorProfileId === vendorProfileId &&
    review.bookingIntent?.status === 'confirmed_intent'
  );
}

/** Conteos de las dos invariantes demo-críticas para el vendor demo principal. */
export interface DemoReadinessResult {
  vendorProfileId: string;
  confirmedIntentCount: number;
  verifiedReviewCount: number;
}

/**
 * Error accionable de demo readiness. `code` es uno de los identificadores estables
 * (`demo_readiness_missing_*`) para logs/CI; `message` explica la condición y el próximo paso.
 */
export class DemoReadinessError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DemoReadinessError';
  }
}

/**
 * Aserción sin falso verde (AC-03 / VR-03): lanza `DemoReadinessError` con el identificador de la
 * condición ausente y un mensaje accionable. No retorna nada si AMBAS invariantes (VR-01 y VR-02)
 * se cumplen. El orden evalúa primero el `confirmed_intent` (precondición de la reseña verificada).
 */
export function assertDemoReadiness(result: DemoReadinessResult): void {
  if (result.confirmedIntentCount < 1) {
    throw new DemoReadinessError(
      DEMO_READINESS_MISSING_CONFIRMED_INTENT,
      `${DEMO_READINESS_MISSING_CONFIRMED_INTENT}: el vendor demo principal (${result.vendorProfileId}) ` +
        `no tiene ningún BookingIntent 'confirmed_intent' (is_seed + is_simulated). ` +
        `Re-ejecuta el seed ('npm run seed', US-085) o revisa el pinning del vendor demo (US-088).`,
    );
  }
  if (result.verifiedReviewCount < 1) {
    throw new DemoReadinessError(
      DEMO_READINESS_MISSING_VERIFIED_REVIEW,
      `${DEMO_READINESS_MISSING_VERIFIED_REVIEW}: el vendor demo principal (${result.vendorProfileId}) ` +
        `no tiene ninguna reseña verificada ('published' + rating 1..5 + booking_intent 'confirmed_intent'). ` +
        `Re-ejecuta el seed ('npm run seed', US-085) o revisa el pinning del vendor demo (US-088).`,
    );
  }
}
