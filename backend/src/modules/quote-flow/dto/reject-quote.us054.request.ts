// Request DTO — POST /api/v1/quotes/:quoteId/reject (US-054 / BE-001). Tech Spec §7 DTOs.
// Body opcional `{ reason?: string [0..500] }` (D4). `.strict()` para rechazar keys ajenas.
// La cota superior (> 500) NO se aplica aquí: se valida en el use case y se mapea a
// `400 INVALID_REJECTION_REASON` (VR-02, EC-03) en lugar del genérico `VALIDATION_ERROR`.
import { z } from 'zod';

export const REJECTION_REASON_MAX_LENGTH = 500;

export const rejectQuoteBodySchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

export type RejectQuoteBody = z.infer<typeof rejectQuoteBodySchema>;
