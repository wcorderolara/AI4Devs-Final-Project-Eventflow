// Response DTO — Evento (US-095 / BE-001). AC-01/AC-03. Shape público canónico `EventResponseDto`.
// No expone datos cross-user (el use case garantiza ownership). Fechas ISO/`YYYY-MM-DD`; budget
// como decimal string; enums por código del contrato API.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import { EVENT_TYPE_CODES } from '../domain/event-type-codes.js';
import { EVENT_STATUSES } from '../domain/event-lifecycle.js';
import type { EventView } from '../domain/event.js';

export const EventResponseSchema = z
  .object({
    id: z.string().uuid(),
    ownerId: z.string().uuid(),
    eventTypeCode: z.enum(EVENT_TYPE_CODES),
    name: z.string(),
    eventDate: z.string(),
    guestsCount: z.number().int(),
    locationId: z.string().uuid(),
    estimatedBudget: z.string(),
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    languageCode: z.enum(SUPPORTED_LANGUAGES),
    status: z.enum(EVENT_STATUSES),
    notes: z.string().nullable(),
    autoCompleted: z.boolean(),
    completedAt: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type EventResponse = z.infer<typeof EventResponseSchema>;

/** La vista de dominio ya está en shape API; el DTO es la proyección serializable. */
export function toEventResponse(view: EventView): EventResponse {
  return { ...view };
}
