// Query DTO — Listado de cotizaciones (US-092 / BE-005). AC-03; VR-01, VR-05.
import { z } from 'zod';

export const ListQuotesQuerySchema = z
  .object({
    status: z.enum(['pending', 'accepted', 'rejected', 'expired']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  })
  .strict();

export type ListQuotesQuery = z.infer<typeof ListQuotesQuerySchema>;
