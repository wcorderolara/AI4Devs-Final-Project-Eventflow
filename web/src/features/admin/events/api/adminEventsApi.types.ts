// US-016 / FE-001 — DTOs del cliente admin de eventos. Espejo del contrato backend
// `GET /api/v1/admin/events/:id` (§9 API Contract + §7 DTOs de la Tech Spec).
// US-078 / FE-004 — extensión aditiva: `counts`, `budgetSummary` (detail) + tipos de listado
// (`AdminEventListItemModel`, `AdminEventsListFilters`, `AdminEventsListDTO`, `AdminEventStatusValue`).
import type {
  CurrencyCode,
  EventStatus,
  EventTypeCode,
  LanguageCode,
} from '@/features/events/api/eventsApi.types';

export interface AdminEventOwnerModel {
  id: string;
  displayName: string;
}

/** US-078 §7 — agregados de sub-entidades para la vista de detalle. */
export interface AdminEventCountsModel {
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

/** US-078 §7 — resumen de budget del evento. `null` cuando el evento no tiene budget. */
export interface AdminEventBudgetSummaryModel {
  totalPlanned: string;
  totalCommitted: string;
}

export interface AdminEventModel {
  id: string;
  ownerId: string;
  eventTypeCode: EventTypeCode;
  name: string;
  eventDate: string;
  guestsCount: number;
  locationId: string;
  estimatedBudget: string;
  currencyCode: CurrencyCode;
  languageCode: LanguageCode;
  status: EventStatus;
  notes: string | null;
  autoCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deleted: boolean;
  owner: AdminEventOwnerModel;
  /** US-078 — presente cuando el backend devolvió counts (default en producción). */
  counts?: AdminEventCountsModel;
  budgetSummary?: AdminEventBudgetSummaryModel | null;
}

export interface AdminEventEnvelopeDTO {
  data: AdminEventModel;
  meta: { correlationId: string; timestamp?: string };
}

// ── US-078 · list contract ──────────────────────────────────────────────────

/**
 * Valores canónicos del enum Prisma `EventStatus` (deviation DEV-2). La Tech Spec §7
 * menciona `planning|in_progress` que NO existen en el schema; el cliente se alinea con
 * los 4 valores realmente soportados por el backend.
 */
export type AdminEventStatusValue = 'draft' | 'active' | 'completed' | 'cancelled';

export interface AdminEventsListFilters {
  status?: AdminEventStatusValue[];
  eventTypeId?: string;
  eventDateFrom?: string;
  eventDateTo?: string;
  organizerSearch?: string;
  pageSize?: number;
  cursor?: string;
}

export interface AdminEventListOwnerModel {
  id: string;
  email: string;
  fullName: string | null;
}

export interface AdminEventListTypeModel {
  id: string;
  code: string;
  label: string;
}

export interface AdminEventListItemModel {
  id: string;
  title: string;
  status: AdminEventStatusValue;
  eventDate: string | null;
  guestsCount: number | null;
  estimatedBudget: string | null;
  currency: string;
  createdAt: string;
  deletedAt: string | null;
  owner: AdminEventListOwnerModel;
  eventType: AdminEventListTypeModel;
}

export interface AdminEventsListPagination {
  nextCursor: string | null;
  pageSize: number;
}

export interface AdminEventsListDTO {
  items: AdminEventListItemModel[];
  pagination: AdminEventsListPagination;
}

export interface AdminEventsListEnvelope {
  data: AdminEventsListDTO;
  meta?: { correlationId: string; timestamp?: string };
}
