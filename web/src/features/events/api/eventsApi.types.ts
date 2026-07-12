// DTOs de la feature events (US-009..US-014). Espejo del contrato backend `/api/v1/events*`
// (EventResponse, Doc 16). Fechas `YYYY-MM-DD`/ISO; budget como decimal string; enums por código.

export const EVENT_TYPE_CODES = [
  'wedding',
  'xv',
  'baptism',
  'baby_shower',
  'birthday',
  'corporate',
] as const;
export type EventTypeCode = (typeof EVENT_TYPE_CODES)[number];

export const EVENT_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_CURRENCIES = ['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const;
export type CurrencyCode = (typeof EVENT_CURRENCIES)[number];

export const EVENT_LANGUAGES = ['es-LATAM', 'es-ES', 'pt', 'en'] as const;
export type LanguageCode = (typeof EVENT_LANGUAGES)[number];

export const EVENT_SORT_OPTIONS = [
  'eventDate:asc',
  'eventDate:desc',
  'createdAt:asc',
  'createdAt:desc',
] as const;
export type EventSortOption = (typeof EVENT_SORT_OPTIONS)[number];

/** Vista pública de evento (`EventResponse`). */
export interface EventModel {
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
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface EventEnvelopeDTO {
  data: EventModel;
  meta: { correlationId: string; timestamp?: string };
}

export interface EventListEnvelopeDTO {
  data: EventModel[];
  pagination: PaginationMeta;
  meta: { correlationId: string; timestamp?: string };
}

export interface EventListResult {
  items: EventModel[];
  pagination: PaginationMeta;
}

export interface ListEventsParams {
  status?: EventStatus;
  eventTypeCode?: EventTypeCode;
  eventDateFrom?: string;
  eventDateTo?: string;
  page?: number;
  pageSize?: number;
  sort?: EventSortOption;
}

/** Cuerpo de `POST /events`. */
export interface CreateEventRequestDTO {
  eventTypeCode: EventTypeCode;
  eventDate: string;
  guestsCount: number;
  locationId: string;
  estimatedBudget: string;
  currencyCode: CurrencyCode;
  languageCode: LanguageCode;
  name?: string;
  notes?: string;
}

/** Cuerpo de `PATCH /events/:id` (currency inmutable, no incluida). */
export interface UpdateEventRequestDTO {
  eventTypeCode?: EventTypeCode;
  eventDate?: string;
  guestsCount?: number;
  locationId?: string;
  estimatedBudget?: string;
  languageCode?: LanguageCode;
  name?: string;
  notes?: string | null;
}

/** Catálogo `GET /event-types`. */
export interface EventTypeOption {
  code: EventTypeCode;
  label: string;
}
export interface EventTypesEnvelopeDTO {
  data: EventTypeOption[];
  meta: { correlationId: string; timestamp?: string };
}

/** Catálogo `GET /locations`. */
export interface LocationOption {
  id: string;
  country: string;
  region: string | null;
  city: string | null;
}
export interface LocationsEnvelopeDTO {
  data: LocationOption[];
  meta: { correlationId: string; timestamp?: string };
}
