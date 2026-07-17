// Body DTO — Toggle Quote.is_preferred (US-058 / BE-001). D1: body `{ is_preferred: boolean }`.
// `.strict()` bloquea cualquier campo ajeno (defensa en profundidad: sin toggles ocultos).
import { z } from 'zod';

export const preferQuoteBodySchema = z
  .object({
    is_preferred: z.boolean(),
  })
  .strict();

export type PreferQuoteBody = z.infer<typeof preferQuoteBodySchema>;
