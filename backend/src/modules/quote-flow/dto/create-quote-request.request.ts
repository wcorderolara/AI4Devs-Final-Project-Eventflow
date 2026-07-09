// Request DTO — Crear QuoteRequest (US-096 / BE-001). AC-01; VR-02.
// El organizer envía vendor + categoría + brief (summary/requirements/questions, constraints opc.)
// y opcionalmente una referencia a AIRecommendation existente (no se invoca IA).
import { z } from 'zod';

export const QuoteRequestBriefSchema = z
  .object({
    summary: z.string().min(1).max(2000),
    requirements: z.array(z.string().min(1).max(500)).min(1),
    questions: z.array(z.string().min(1).max(500)).min(1),
    constraints: z.array(z.string().min(1).max(500)).optional(),
  })
  .strict();

export const CreateQuoteRequestRequestSchema = z
  .object({
    vendorProfileId: z.string().uuid(),
    serviceCategoryId: z.string().uuid(),
    brief: QuoteRequestBriefSchema,
    aiRecommendationId: z.string().uuid().optional(),
  })
  .strict();

export type CreateQuoteRequestRequest = z.infer<typeof CreateQuoteRequestRequestSchema>;
