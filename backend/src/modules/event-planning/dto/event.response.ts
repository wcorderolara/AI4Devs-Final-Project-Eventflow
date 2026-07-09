// Response DTO — Evento (US-092 / BE-004). AC-03; VR-05.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { SUPPORTED_LANGUAGES } from '../../../shared/constants/languages.js';

export const EventResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    event_type_id: z.string().uuid(),
    event_date: z.string().datetime(),
    location_country: z.string().length(2),
    location_city: z.string(),
    currency: z.enum(SUPPORTED_CURRENCIES),
    language: z.enum(SUPPORTED_LANGUAGES),
    description: z.string().nullable().optional(),
    status: z.enum(['draft', 'active', 'completed', 'cancelled']),
    createdAt: z.string().datetime(),
  })
  .strict();

export type EventResponse = z.infer<typeof EventResponseSchema>;
