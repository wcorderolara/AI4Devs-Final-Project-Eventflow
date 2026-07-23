// US-073 (PB-P2-009 / FE-001). `TYPE_TO_VARIANT` — mapping declarativo de
// `notification.type` a un `ItemVariant` visual (D4). El variant combina COLOR
// + ICONO + TEXTO complementario (NFR-A11Y-005 anti color-only) — el `variant`
// por sí solo NO es la única señal.
//
// El fallback para tipos desconocidos es `'neutral'` (EC-05). El copy
// complementario asociado se localiza vía `notifications.variants.<v>.aria`
// (FE-003) para cumplir WCAG "no color-only".
//
// La tabla incluye todos los types que hoy emiten upstream:
//   - `task_due_soon`         (US-034 / US-071) → info (recordatorio organizador)
//   - `quote_request_received`(US-068)          → info (nueva QR vendor)
//   - `quote_received`        (US-069)          → info (nueva cotización organizer)
//   - `booking_confirmed`     (US-070)          → success (confirmación bilateral)
//   - `quote_rejected`        (US-054 → US-073) → destructive
//   - `quote_expired`         (US-054 → US-073) → warning
//   - `review_received`                          → neutral (placeholder)
//   - `vendor_approved`                          → success (placeholder US-047)
//   - `vendor_rejected`                          → destructive (placeholder US-047)

/** Variantes visuales soportadas por `NotificationItem`. */
export type ItemVariant = 'destructive' | 'warning' | 'info' | 'success' | 'neutral';

/**
 * Mapping declarativo `type` → `variant`. Ampliar aquí cuando se agregue un
 * nuevo `NotificationType`. Los `type` NO listados caen al fallback `'neutral'`
 * (ver `getVariantForType`).
 */
export const TYPE_TO_VARIANT: Readonly<Record<string, ItemVariant>> = Object.freeze({
  quote_rejected: 'destructive',
  quote_expired: 'warning',
  quote_request_received: 'info',
  quote_received: 'info',
  booking_confirmed: 'success',
  task_due_soon: 'info',
  review_received: 'neutral',
  vendor_approved: 'success',
  vendor_rejected: 'destructive',
});

/**
 * Devuelve el `ItemVariant` para un `type` de notificación. Si `type` no está
 * en `TYPE_TO_VARIANT` (p. ej. type nuevo introducido server-side todavía sin
 * mapping FE), devuelve el fallback `'neutral'` — evita crashear la UI (EC-05).
 */
export function getVariantForType(type: string): ItemVariant {
  return TYPE_TO_VARIANT[type] ?? 'neutral';
}
