// EventLifecycle — política de transiciones de estado de evento (US-095 / BE-002). AC-06/AC-07;
// EC-05. Estados: draft, active, completed, cancelled. Capa domain pura (sin infra/framework).
export const EVENT_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type EventStatusValue = (typeof EVENT_STATUSES)[number];

export const TERMINAL_STATUSES: ReadonlySet<EventStatusValue> = new Set(['completed', 'cancelled']);

/** `activate`: solo desde `draft` → `active` (AC-06). */
export function canActivate(current: EventStatusValue): boolean {
  return current === 'draft';
}

/** `cancel`: desde cualquier estado NO terminal (draft o active) → `cancelled` (AC-07). */
export function canCancel(current: EventStatusValue): boolean {
  return !TERMINAL_STATUSES.has(current);
}

/** ¿El evento admite edición de campos (PATCH)? No en estados terminales (EC-05). */
export function isMutable(current: EventStatusValue): boolean {
  return !TERMINAL_STATUSES.has(current);
}
