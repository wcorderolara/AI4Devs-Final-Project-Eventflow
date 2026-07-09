// Query DTO — Listado de QuoteRequests (US-096 / BE-001). AC-02/AC-03. Paginación acotada + filtro
// opcional por status.
import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/validation/pagination.js';
import { QUOTE_REQUEST_STATUSES } from '../domain/quote-request.js';

export const ListQuoteRequestsQuerySchema = z
  .object({
    ...paginationQueryShape,
    status: z.enum(QUOTE_REQUEST_STATUSES).optional(),
  })
  .strict();

export type ListQuoteRequestsQuery = z.infer<typeof ListQuoteRequestsQuerySchema>;
