// Response DTO — Quote (US-096 / BE-001). AC-07/08/09. `totalPrice`/`currencyCode` mapean a
// `amount`/`currency` en persistencia.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { QUOTE_STATUSES } from '../domain/quote.js';
import type { QuoteView } from '../domain/quote.js';

export const QuoteResponseSchema = z
  .object({
    id: z.string().uuid(),
    quoteRequestId: z.string().uuid(),
    vendorProfileId: z.string().uuid(),
    totalPrice: z.string(),
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    breakdown: z.array(z.object({ label: z.string(), amount: z.string() }).strict()).nullable(),
    conditions: z.string().nullable(),
    validUntil: z.string().nullable(),
    status: z.enum(QUOTE_STATUSES),
    isPreferred: z.boolean(),
    sentAt: z.string().nullable(),
    acceptedAt: z.string().nullable(),
    rejectedAt: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export function toQuoteResponse(v: QuoteView): QuoteResponse {
  return { ...v };
}
