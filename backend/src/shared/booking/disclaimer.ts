// US-063 (PB-P1-037 / BE-001) — Constante de versión del copy del BookingIntent disclaimer.
//
// Fuente única de verdad para el `agreementCopyVersion` persistido en las columnas
// `booking_intents.disclaimer_copy_version_create/confirm` (DB-002) y emitido en el log
// estructurado `disclaimer.accepted` (Decisión D5). El MVP entrega sólo la version `v1`.
//
// Cualquier bump futuro (`v2`, ...) requiere ADR (Decisión D7 + política de release del disclaimer)
// y actualización coordinada del copy en los 4 locales `booking.disclaimer.v1.*` — mientras
// tanto el frontend renderiza la version desde este mismo símbolo compartido en la UI del
// componente shared `BookingDisclaimer` (evita drift entre backend y frontend).
export const BOOKING_DISCLAIMER_COPY_VERSION = 'v1' as const;

export type BookingDisclaimerCopyVersion = typeof BOOKING_DISCLAIMER_COPY_VERSION;
