// Request DTO — Crear Quote (US-096 / BE-001). AC-07; VR-06.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { decimalStringSchema } from '../../../shared/validation/numeric.js';

export const QuoteBreakdownItemSchema = z
  .object({ label: z.string().min(1).max(200), amount: decimalStringSchema })
  .strict();

export const CreateQuoteRequestBodySchema = z
  .object({
    totalPrice: decimalStringSchema,
    breakdown: z.array(QuoteBreakdownItemSchema).min(1),
    conditions: z.string().min(1).max(4000),
    currencyCode: z.enum(SUPPORTED_CURRENCIES),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validUntil debe ser YYYY-MM-DD').optional(),
  })
  .strict();

export type CreateQuoteRequestBody = z.infer<typeof CreateQuoteRequestBodySchema>;
