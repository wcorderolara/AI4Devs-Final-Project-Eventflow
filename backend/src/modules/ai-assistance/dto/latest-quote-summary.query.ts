// Query DTO — GET /events/:eventId/ai/quote-summary?category_code=<slug> (US-059 / BE-001, VR-03).
// `.strict()` + `category_code` obligatorio. Sin él ⇒ `400 INVALID_FILTERS` (EC-04).
import { z } from 'zod';

export const LatestQuoteSummaryQuerySchema = z
  .object({
    category_code: z.string().min(1).max(64),
  })
  .strict();

export type LatestQuoteSummaryQuery = z.infer<typeof LatestQuoteSummaryQuerySchema>;
