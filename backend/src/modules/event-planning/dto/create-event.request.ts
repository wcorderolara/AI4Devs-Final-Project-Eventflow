// Request DTO — Crear evento (US-095 / BE-001). AC-01; VR-01..VR-06, VR-08.
// Contrato Doc 16: `eventTypeCode` (enum), `locationId` (FK), `guestsCount`, `estimatedBudget`,
// `currencyCode`, `languageCode`, opcionales `name`/`notes`. La existencia de EventType/Location
// se valida en el use case (EC-04). `currencyCode` se fija aquí y es inmutable en PATCH (AC-05).
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';
import { EVENT_TYPE_CODES } from '../domain/event-type-codes.js';

/** `YYYY-MM-DD` válido (VR-02). Refina que sea una fecha calendario real. */
export const eventDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'eventDate debe tener formato YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)), 'eventDate no es una fecha válida');

/** Decimal string no negativo (VR-05), hasta 2 decimales. */
export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'estimatedBudget debe ser un decimal >= 0 con hasta 2 decimales');

export const CreateEventRequestSchema = z
  .object({
    eventTypeCode: z.enum(EVENT_TYPE_CODES),
    eventDate: eventDateSchema,
    guestsCount: z.number().int().min(1),
    locationId: z.string().uuid(),
    estimatedBudget: decimalStringSchema,
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    languageCode: z.enum(SUPPORTED_LANGUAGES),
    name: z.string().min(1).max(120).trim().optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;
