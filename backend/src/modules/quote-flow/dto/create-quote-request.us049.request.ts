// DTO Zod del endpoint `POST /api/v1/quote-requests` (US-049 / BE-001). Tech Spec §7 DTOs.
// Body con brief `{ budget, message }` y flag opcional `source` que decide `ai_generated_brief`.
// La `currency_code` NO se acepta desde el cliente: se hereda del evento por el UseCase (SEC).
import { z } from 'zod';

export const createQuoteRequestBriefUs049Schema = z
  .object({
    // Numérico decimal con hasta 2 decimales (numeric(14,2)). Se transporta como string para
    // evitar drift de precisión en JSON; el UseCase valida `>= 0` sobre el número parseado.
    budget: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'budget must be a non-negative decimal with up to 2 decimals'),
    message: z.string().min(0).max(5000),
  })
  .strict();

export const createQuoteRequestUs049BodySchema = z
  .object({
    event_id: z.string().uuid(),
    vendor_profile_id: z.string().uuid(),
    service_category_id: z.string().uuid(),
    brief: createQuoteRequestBriefUs049Schema,
    source: z.enum(['manual', 'ai_generated']).default('manual'),
  })
  .strict();

export type CreateQuoteRequestUs049Body = z.infer<typeof createQuoteRequestUs049BodySchema>;
