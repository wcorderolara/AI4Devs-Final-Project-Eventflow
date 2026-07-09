// Request DTO — Actualizar evento (US-095 / BE-001). AC-04/AC-05; VR-07, VR-09.
// Campos editables opcionales. `currencyCode` se ACEPTA en el schema pero el use case lo rechaza
// con `409 CURRENCY_IMMUTABLE` (AC-05) — así se distingue del rechazo `400` por campo desconocido.
// Campos no editables (`ownerId`, `status`, `completedAt`, `autoCompleted`, `isSeed`, timestamps)
// se rechazan por `.strict()` (VR-09).
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import { EVENT_TYPE_CODES } from '../domain/event-type-codes.js';
import { eventDateSchema, decimalStringSchema } from './create-event.request.js';

export const UpdateEventRequestSchema = z
  .object({
    eventTypeCode: z.enum(EVENT_TYPE_CODES).optional(),
    eventDate: eventDateSchema.optional(),
    guestsCount: z.number().int().min(1).optional(),
    locationId: z.string().uuid().optional(),
    estimatedBudget: decimalStringSchema.optional(),
    languageCode: z.enum(SUPPORTED_LANGUAGES).optional(),
    name: z.string().min(1).max(120).trim().optional(),
    notes: z.string().max(2000).nullable().optional(),
    // Aceptado por el schema para producir 409 (no 400) en el use case; inmutable (AC-05).
    currencyCode: z.enum(SUPPORTED_CURRENCIES).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debe incluir al menos un campo a actualizar',
  });

export type UpdateEventRequest = z.infer<typeof UpdateEventRequestSchema>;
