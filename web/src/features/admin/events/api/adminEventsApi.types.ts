// US-016 / FE-001 — DTOs del cliente admin de eventos. Espejo del contrato backend
// `GET /api/v1/admin/events/:id` (§9 API Contract + §7 DTOs de la Tech Spec).
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
}

export interface AdminEventEnvelopeDTO {
  data: AdminEventModel;
  meta: { correlationId: string; timestamp?: string };
}
