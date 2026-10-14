// Param DTOs de rutas QuoteRequest (US-096 / BE-001).
import { z } from 'zod';
import { EventIdParamSchema, uuidParamsSchema } from '../../../shared/validation/uuid-params.js';

export { EventIdParamSchema };
export type EventIdParam = z.infer<typeof EventIdParamSchema>;

export const QuoteRequestIdParamSchema = uuidParamsSchema('quoteRequestId');
export type QuoteRequestIdParam = z.infer<typeof QuoteRequestIdParamSchema>;
