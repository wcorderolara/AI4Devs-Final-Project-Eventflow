// Request DTO — PATCH /api/v1/quote-requests/:quoteRequestId/cancel (US-056 / BE-001). Tech Spec §7 DTOs.
// Body opcional `{ reason?: string [0..500] }` (D4). `.strict()` para rechazar keys ajenas.
// La cota superior (> 500) NO se aplica aquí: se valida en el use case y se mapea a
// `400 INVALID_CANCELLATION_REASON` (VR-02, EC-04) en lugar del genérico `VALIDATION_ERROR`.
import { z } from 'zod';

export const CANCELLATION_REASON_MAX_LENGTH = 500;

export const cancelQuoteRequestBodySchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

export type CancelQuoteRequestBody = z.infer<typeof cancelQuoteRequestBodySchema>;
