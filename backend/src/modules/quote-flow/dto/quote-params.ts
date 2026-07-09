// Param DTO — `:quoteId` (US-096 / BE-001).
import { z } from 'zod';
export const QuoteIdParamSchema = z.object({ quoteId: z.string().uuid() }).strict();
export type QuoteIdParam = z.infer<typeof QuoteIdParamSchema>;
