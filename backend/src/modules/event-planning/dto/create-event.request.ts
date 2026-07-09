// Request DTO — Crear evento (US-092 / BE-004). AC-03; VR-01, VR-05.
// Validación sintáctica; las reglas semánticas (event_date >= now+1d, event_type_id activo)
// pertenecen a la capa Application.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const CreateEventRequestSchema = z
  .object({
    name: z.string().min(1).max(120),
    event_type_id: z.string().uuid(),
    event_date: z.string().datetime(),
    location_country: z.string().length(2),
    location_city: z.string().min(1).max(80),
    currency: z.enum(SUPPORTED_CURRENCIES),
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
    description: z.string().max(2000).optional(),
  })
  .strict();

export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;
