// Query DTO — Listado de eventos (US-092 / BE-004). AC-03; VR-01, VR-05.
// Los query params llegan como string en la URL → `z.coerce.number()` para los numéricos.
import { z } from 'zod';

export const ListEventsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
    status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
    sortBy: z.enum(['createdAt', 'eventDate', 'name']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
