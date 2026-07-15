// Param/body DTOs de rutas AI (US-097 / BE-001).
import { z } from 'zod';

export const EventIdParamSchema = z.object({ eventId: z.string().uuid() }).strict();
export type EventIdParam = z.infer<typeof EventIdParamSchema>;

export const QuoteRequestIdParamSchema = z.object({ quoteRequestId: z.string().uuid() }).strict();
export type QuoteRequestIdParam = z.infer<typeof QuoteRequestIdParamSchema>;

export const AiRecommendationIdParamSchema = z.object({ aiRecommendationId: z.string().uuid() }).strict();
export type AiRecommendationIdParam = z.infer<typeof AiRecommendationIdParamSchema>;

// US-037 (PB-P1-021 / BE-001): body real del /apply. Acepta `editedPayload` (nombre HITL canónico)
// y `editedOutput` como alias legacy (US-097 borrador). El controller normaliza a `editedPayload`.
export const ApplyAiRecommendationSchema = z
  .object({
    editedPayload: z.record(z.unknown()).optional(),
    editedOutput: z.record(z.unknown()).optional(),
  })
  .strict();
export type ApplyAiRecommendation = z.infer<typeof ApplyAiRecommendationSchema>;
