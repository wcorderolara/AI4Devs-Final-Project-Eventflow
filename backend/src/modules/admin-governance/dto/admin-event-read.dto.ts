// US-016 / BE-002 — Response DTO `AdminEventReadDTO`. Proyección read-only del evento para el
// admin: incluye todos los campos operativos + `deleted` (soft-delete flag) + `owner` mínimo.
// Whitelist explícita: no expone datos internos no requeridos por la vista (VR-02).
import type { AdminEventStatus, AdminEventTypeCode } from '../domain/admin-event.types.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface AdminEventOwnerView {
  id: string;
  displayName: string;
}

/** Vista admin read-only de un evento (US-016 §7 DTOs / Schemas). */
export interface AdminEventReadView {
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
  completedAt: string | null; // ISO 8601 o null
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  deletedAt: string | null; // ISO 8601 o null
  deleted: boolean; // EC-01: banner "Eliminado"
  owner: AdminEventOwnerView;
}

export type AdminEventReadResponse = AdminEventReadView;
