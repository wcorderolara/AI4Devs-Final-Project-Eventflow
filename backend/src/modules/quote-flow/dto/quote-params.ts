// Param DTO — `:quoteId` (US-096 / BE-001).
import { z } from 'zod';
import { uuidParamsSchema } from '../../../shared/validation/uuid-params.js';
export const QuoteIdParamSchema = uuidParamsSchema('quoteId');
export type QuoteIdParam = z.infer<typeof QuoteIdParamSchema>;
