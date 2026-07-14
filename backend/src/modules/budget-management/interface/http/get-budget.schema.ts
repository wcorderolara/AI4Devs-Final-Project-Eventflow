// US-035 (PB-P1-020 / BE-004, R1) — Schema Zod del path param del endpoint.
// `eventId` UUID (VR-02, NT-05) → ValidationError → 400 VALIDATION.
import { z } from 'zod';

export const getBudgetParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export type GetBudgetParams = z.infer<typeof getBudgetParamsSchema>;
