// Request DTO — Editar Quote draft (US-096 / BE-001). AC-08; VR-08. Campos opcionales, ≥1.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';
import { decimalStringSchema } from '../../../shared/validation/numeric.js';
import { QuoteBreakdownItemSchema } from './create-quote.request.js';

export const UpdateQuoteRequestBodySchema = z
  .object({
    totalPrice: decimalStringSchema.optional(),
    breakdown: z.array(QuoteBreakdownItemSchema).min(1).optional(),
    conditions: z.string().min(1).max(4000).optional(),
    currencyCode: z.enum(SUPPORTED_CURRENCIES).optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, { message: 'Debe incluir al menos un campo' });

export type UpdateQuoteRequestBody = z.infer<typeof UpdateQuoteRequestBodySchema>;
