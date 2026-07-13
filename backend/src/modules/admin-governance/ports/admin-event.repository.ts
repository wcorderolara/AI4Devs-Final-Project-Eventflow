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
}

export interface AdminEventRepository {
  /** Devuelve el evento por id incluyendo `deleted_at IS NOT NULL` (uso exclusivo admin). */
  findByIdIncludingDeleted(eventId: string): Promise<AdminEventRow | null>;
}
