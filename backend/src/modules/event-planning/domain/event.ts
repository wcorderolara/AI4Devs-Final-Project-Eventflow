// Tipos de dominio de evento (US-095 / BE-002/003). Vista pública `EventView` en shape del
// contrato API (códigos, fechas `YYYY-MM-DD`/ISO, decimal string). El repositorio traduce
// entre el modelo Prisma (userId/eventTypeId/title/currency/language) y esta vista.
import type { EventTypeCode } from './event-type-codes.js';
import type { EventStatusValue } from './event-lifecycle.js';
import type { SupportedCurrency } from '../../../shared/constants/currencies.js';
import type { SupportedLanguage } from '../../../shared/constants/languages.js';

export interface EventView {
  id: string;
  ownerId: string;
  eventTypeCode: EventTypeCode;
  name: string;
  eventDate: string; // YYYY-MM-DD
  guestsCount: number;
  locationId: string;
  estimatedBudget: string; // decimal string
  currencyCode: SupportedCurrency;
  languageCode: SupportedLanguage;
  status: EventStatusValue;
  notes: string | null;
  autoCompleted: boolean;
  completedAt: string | null; // ISO 8601 o null
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Datos para persistir un evento nuevo (owner + FK ya resueltas por el use case). */
export interface CreateEventData {
  ownerId: string;
  eventTypeId: string;
  name: string; // -> title
  eventDate: string; // YYYY-MM-DD
  guestsCount: number;
  locationId: string;
  estimatedBudget: string;
  currency: SupportedCurrency;
  language: SupportedLanguage;
  notes: string | null;
}

/** Parche de campos editables (currency NO editable). `eventTypeId` ya resuelto desde el code. */
export interface UpdateEventData {
  eventTypeId?: string;
  name?: string;
  eventDate?: string;
  guestsCount?: number;
  locationId?: string;
  estimatedBudget?: string;
  language?: SupportedLanguage;
  notes?: string | null;
}
