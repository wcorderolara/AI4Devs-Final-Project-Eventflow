// Request DTO — Actualizar evento (US-092 / BE-004). AC-03; VR-01, VR-05.
// `currency` es inmutable (BR-BUDGET-001, Domain) → se excluye. Resto de campos opcionales.
import { z } from 'zod';
import { CreateEventRequestSchema } from './create-event.request.js';

export const UpdateEventRequestSchema = CreateEventRequestSchema.omit({ currency: true })
  .partial()
  .strict();

export type UpdateEventRequest = z.infer<typeof UpdateEventRequestSchema>;
