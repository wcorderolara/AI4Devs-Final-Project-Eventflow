// Request DTO — Respuesta del vendor a una cotización (US-092 / BE-005). AC-03; VR-01, VR-05.
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../../../shared/constants/currencies.js';

export const RespondQuoteRequestSchema = z
  .object({
    quote_request_id: z.string().uuid(),
    price: z.number().positive(),
    currency: z.enum(SUPPORTED_CURRENCIES),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export type RespondQuoteRequest = z.infer<typeof RespondQuoteRequestSchema>;
