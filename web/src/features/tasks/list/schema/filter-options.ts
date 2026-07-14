// US-027 (PB-P1-018 / FE-003) — Catálogo enum de status para los filtros UI.
// Alineado con el DTO `TaskListItemStatus` del backend (incluye `active` tras US-031).
export const STATUS_OPTIONS = [
  'pending',
  'active',
  'in_progress',
  'done',
  'skipped',
] as const;
export type StatusOption = (typeof STATUS_OPTIONS)[number];
