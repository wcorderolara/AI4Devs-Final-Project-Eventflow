// Param DTOs de rutas QuoteRequest (US-096 / BE-001).
import { z } from 'zod';

export const EventIdParamSchema = z.object({ eventId: z.string().uuid() }).strict();
export type EventIdParam = z.infer<typeof EventIdParamSchema>;

export const QuoteRequestIdParamSchema = z.object({ quoteRequestId: z.string().uuid() }).strict();
export type QuoteRequestIdParam = z.infer<typeof QuoteRequestIdParamSchema>;
