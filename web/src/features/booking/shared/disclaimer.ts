// US-063 (PB-P1-037 / FE-001) — Mirror frontend de `BOOKING_DISCLAIMER_COPY_VERSION`.
//
// Fuente de verdad canónica: `backend/src/shared/booking/disclaimer.ts`. Este mirror mantiene el
// mismo valor literal en el frontend para renderizar el badge de version en `BookingDisclaimer`
// y como fallback cuando el copy aún no está localizado (EC-03 → es-LATAM + badge). Cualquier
// bump de version (`v2`, ...) requiere ADR (Decisión D7) y actualización coordinada de ambos
// mirrors + los 4 locales `booking.disclaimer.v*.*`.
export const BOOKING_DISCLAIMER_COPY_VERSION = 'v1' as const;

export type BookingDisclaimerCopyVersion = typeof BOOKING_DISCLAIMER_COPY_VERSION;

export type BookingDisclaimerMode = 'create' | 'confirm';
