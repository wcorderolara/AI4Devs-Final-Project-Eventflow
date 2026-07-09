// Response DTO — QuoteRequest (US-096 / BE-001). AC-01/AC-04. Shape público canónico.
import { z } from 'zod';
import { QUOTE_REQUEST_STATUSES } from '../domain/quote-request.js';
import type { QuoteRequestView } from '../domain/quote-request.js';

export const QuoteRequestResponseSchema = z
  .object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    serviceCategoryId: z.string().uuid(),
    vendorProfileId: z.string().uuid().nullable(),
    status: z.enum(QUOTE_REQUEST_STATUSES),
    brief: z
      .object({
        summary: z.string(),
        requirements: z.array(z.string()),
        questions: z.array(z.string()),
        constraints: z.array(z.string()).optional(),
      })
      .nullable(),
    aiRecommendationId: z.string().uuid().nullable(),
    viewedAt: z.string().nullable(),
    cancelledAt: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type QuoteRequestResponse = z.infer<typeof QuoteRequestResponseSchema>;

export function toQuoteRequestResponse(v: QuoteRequestView): QuoteRequestResponse {
  return { ...v };
}
