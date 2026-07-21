// US-016 / BE-001 — Puerto de persistencia admin para eventos.
// `findByIdIncludingDeleted` ignora el filtro `deleted_at IS NULL` (a diferencia del repositorio
// owner-scoped de event-planning) y trae los datos mínimos del owner para render admin (§7 Repository).
// Module-local: solo `admin-governance` lo consume; el módulo del organizador NO expone este método.
import type { AdminEventStatus, AdminEventTypeCode } from '../domain/admin-event.types.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface AdminEventOwnerRow {
  id: string;
  displayName: string;
}

/**
 * US-078 / BE-003 — agregados y budget cargados en la misma read para evitar N+1.
 * Todos los counts son enteros ≥ 0. Cuando el evento no tiene `budget` la relación 1:1
 * devuelve `budgetSummary: null`.
 */
export interface AdminEventCountsRow {
  tasks: number;
  tasksCompleted: number;
  quoteRequests: number;
  quoteRequestsActive: number;
  quotes: number;
  quotesAccepted: number;
  bookingIntents: number;
  bookingIntentsConfirmed: number;
  aiRecommendations: number;
}

export interface AdminEventBudgetRow {
  totalPlanned: string;
  totalCommitted: string;
}

export interface AdminEventRow {
  id: string;
  ownerId: string;
  eventTypeCode: AdminEventTypeCode;
  name: string;
  eventDate: string; // YYYY-MM-DD | ''
  guestsCount: number;
  locationId: string;
  estimatedBudget: string;
  currencyCode: SupportedCurrency;
  languageCode: SupportedLanguage;
  status: AdminEventStatus;
  notes: string | null;
  autoCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  owner: AdminEventOwnerRow;
  /** US-078 — presentes cuando la lectura vino de `findDetailByIdIncludingDeleted`. */
  counts?: AdminEventCountsRow;
  budgetSummary?: AdminEventBudgetRow | null;
}

export interface AdminEventRepository {
  /** Devuelve el evento por id incluyendo `deleted_at IS NOT NULL` (uso exclusivo admin). */
  findByIdIncludingDeleted(eventId: string): Promise<AdminEventRow | null>;

  /**
   * US-078 §7 detail: mismo criterio de lectura que `findByIdIncludingDeleted` pero además
   * puebla `counts` (agregados de sub-entidades) y `budgetSummary` en la misma transacción
   * lógica. Se ejecuta dentro del `$transaction` del `AdminViewEventUseCase` para garantizar
   * consistencia con el INSERT de `AdminAction(view_event)`.
   *
   * Opcional en la interfaz para preservar retro-compatibilidad con fakes en memoria de la
   * suite legada US-016 (que sólo implementan `findByIdIncludingDeleted`). El use case hace
   * fallback transparente al método base cuando este no está presente.
   */
  findDetailByIdIncludingDeleted?(eventId: string): Promise<AdminEventRow | null>;
}
