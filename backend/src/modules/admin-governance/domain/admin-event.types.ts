// US-016 — Alias de tipos locales al módulo admin-governance para evitar cruzar barreras con
// `event-planning` (ADR-ARCH-001). Estos códigos viven en el contrato API (Doc 16 §Events) y son
// estables por diseño: replicarlos aquí es más seguro que importar internals de otro módulo.

/** Códigos de estado de evento expuestos por el contrato API. */
export type AdminEventStatus = 'draft' | 'active' | 'completed' | 'cancelled';

/** Códigos de tipo de evento expuestos por el contrato API. */
export type AdminEventTypeCode =
  | 'wedding'
  | 'xv'
  | 'baptism'
  | 'baby_shower'
  | 'birthday'
  | 'corporate';
