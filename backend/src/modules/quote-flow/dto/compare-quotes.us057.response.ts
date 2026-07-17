// Response DTO — Comparador de Quotes (US-057 / BE-003, D5).
// Shape whitelisteada: sólo campos públicos del vendor (`business_name`, `slug`, `rating_avg`,
// `reviews_count`) — sin exponer PII (email, phone). Precios como string (Decimal 14,2 → string).
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';

// `preferred` es un derivado visual: `is_preferred=true` domina como indicador. Los estados
// reales del `QuoteStatus` schema son `{draft, sent, accepted, rejected, expired}` (DEV-01).
export const COMPARABLE_QUOTE_STATUSES = ['sent', 'accepted', 'rejected', 'expired'] as const;
export type ComparableQuoteStatus = (typeof COMPARABLE_QUOTE_STATUSES)[number];

export const ComparableQuoteItemSchema = z
  .object({
    quote_id: z.string().uuid(),
    vendor: z
      .object({
        profile_id: z.string().uuid(),
        business_name: z.string(),
        slug: z.string().nullable(),
        rating_avg: z.number().nullable(),
        reviews_count: z.number().int().nonnegative(),
      })
      .strict(),
    status: z.enum(COMPARABLE_QUOTE_STATUSES),
    total_price: z.string(),
    breakdown: z
      .array(z.object({ label: z.string(), amount: z.string() }).strict())
      .nullable(),
    valid_until: z.string().nullable(),
    conditions: z.string().nullable(),
    is_preferred: z.boolean(),
    created_at: z.string(),
  })
  .strict();

export type ComparableQuoteItem = z.infer<typeof ComparableQuoteItemSchema>;

export const CompareQuotesResponseSchema = z
  .object({
    category: z.object({ code: z.string(), name: z.string() }).strict(),
    currency_code: z.enum(SUPPORTED_CURRENCIES),
    items: z.array(ComparableQuoteItemSchema),
  })
  .strict();

export type CompareQuotesResponse = z.infer<typeof CompareQuotesResponseSchema>;
