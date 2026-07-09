// Param/body DTOs de rutas AI (US-097 / BE-001).
import { z } from 'zod';

export const EventIdParamSchema = z.object({ eventId: z.string().uuid() }).strict();
export type EventIdParam = z.infer<typeof EventIdParamSchema>;

export const QuoteRequestIdParamSchema = z.object({ quoteRequestId: z.string().uuid() }).strict();
export type QuoteRequestIdParam = z.infer<typeof QuoteRequestIdParamSchema>;

export const AiRecommendationIdParamSchema = z.object({ aiRecommendationId: z.string().uuid() }).strict();
export type AiRecommendationIdParam = z.infer<typeof AiRecommendationIdParamSchema>;

export const ApplyAiRecommendationSchema = z.object({ editedOutput: z.record(z.unknown()).optional() }).strict();
export type ApplyAiRecommendation = z.infer<typeof ApplyAiRecommendationSchema>;
