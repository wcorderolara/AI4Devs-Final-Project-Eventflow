import { z } from 'zod';
import { EVENT_CURRENCIES, EVENT_LANGUAGES, EVENT_TYPE_CODES } from '../api/eventsApi.types';

/** `YYYY-MM-DD` calendario válido (espeja `eventDateSchema` del backend). */
const eventDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.dateFormat')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)), 'validation.dateInvalid');

/** Decimal string >= 0 con hasta 2 decimales (espeja `decimalStringSchema` del backend). */
const budgetSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'validation.budgetInvalid');

const guestsSchema = z.coerce
  .number({ invalid_type_error: 'validation.guestsInvalid' })
  .int('validation.guestsInvalid')
  .min(1, 'validation.guestsMin')
  .max(100000, 'validation.guestsMax');

/**
 * Schema de creación de evento (US-009 / wizard). Espejo disciplinado de `CreateEventRequestSchema`
 * del backend. `currencyCode` se fija al crear (inmutable en edición, AC-05). Mensajes = claves
 * i18n del namespace `events`.
 */
export const createEventSchema = z.object({
  eventTypeCode: z.enum(EVENT_TYPE_CODES, { errorMap: () => ({ message: 'validation.typeRequired' }) }),
  eventDate: eventDateSchema,
  guestsCount: guestsSchema,
  locationId: z.string().uuid('validation.locationRequired'),
  estimatedBudget: budgetSchema,
  currencyCode: z.enum(EVENT_CURRENCIES),
  languageCode: z.enum(EVENT_LANGUAGES),
  name: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type CreateEventFormValues = z.infer<typeof createEventSchema>;

/**
 * Schema de edición (US-010 / AC-04). Campos editables; `currencyCode` NO editable (AC-05). Todos
 * opcionales; el form envía sólo lo modificado.
 */
export const updateEventSchema = z.object({
  eventTypeCode: z.enum(EVENT_TYPE_CODES),
  eventDate: eventDateSchema,
  guestsCount: guestsSchema,
  locationId: z.string().uuid('validation.locationRequired'),
  estimatedBudget: budgetSchema,
  languageCode: z.enum(EVENT_LANGUAGES),
  name: z.string().trim().min(1).max(120).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type UpdateEventFormValues = z.infer<typeof updateEventSchema>;
