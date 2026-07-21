// US-016 / BE-002 — Response DTO `AdminEventReadDTO`. Proyección read-only del evento para el
// admin: incluye todos los campos operativos + `deleted` (soft-delete flag) + `owner` mínimo.
// Whitelist explícita: no expone datos internos no requeridos por la vista (VR-02).
//
// US-078 / BE-003 — extensión aditiva: agrega `counts` (agregados de sub-entidades) y
// `budgetSummary` (planned + committed cuando el evento tiene budget). Ambos son opcionales
// para preservar la compatibilidad con el consumo previo del contrato (US-016). El backend
// SIEMPRE los emite; los tests unitarios legados que sólo asertan un subset de campos no se
// rompen porque el shape es aditivo.
import type { AdminEventStatus, AdminEventTypeCode } from '../domain/admin-event.types.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface AdminEventOwnerView {
  id: string;
  displayName: string;
}

/**
 * US-078 §7 detail counts. Sub-entidades derivables desde `Event` en el schema actual.
 * NOTA (deviation DEV-4): `reviews` no está incluido — `Event` no expone relación `reviews`
 * en el schema Prisma (los reviews son per-vendor, no per-event). `quotes` cuenta la relación
 * denormalizada `quotesDenormalized` (US-058) que aterriza sobre el eventId directamente.
 */
export interface AdminEventCountsView {
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

/** US-078 §7 detail — resumen del budget (null cuando el evento no tiene budget). */
export interface AdminEventBudgetSummaryView {
  totalPlanned: string;
  totalCommitted: string;
}

/** Vista admin read-only de un evento (US-016 §7 DTOs / Schemas + US-078 counts/budget). */
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
  /** US-078 §7 — agregados de sub-entidades. Opcional para no romper contratos legados. */
  counts?: AdminEventCountsView;
  /** US-078 §7 — resumen de budget cuando existe. null si el evento no tiene budget. */
  budgetSummary?: AdminEventBudgetSummaryView | null;
}

export type AdminEventReadResponse = AdminEventReadView;
