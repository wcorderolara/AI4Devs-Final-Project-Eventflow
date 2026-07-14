// US-036 (PB-P1-020 / BE-001, R1) — Body Zod para POST /events/:eventId/budget/items.
// `.strict()` rechaza cualquier campo extra (incluido `paid`, `ai_generated`, `service_category_id`,
// `committed`) → 400 VALIDATION_ERROR con detail canónico del middleware.
import { z } from 'zod';

export const createBudgetItemBodySchema = z
  .object({
    label: z.string().min(1).max(120),
    category_code: z.string().min(1).max(64).nullable().optional(),
    amount_planned: z.number().nonnegative(),
    amount_committed: z.number().nonnegative().optional(),
  })
  .strict();

export type CreateBudgetItemBody = z.infer<typeof createBudgetItemBodySchema>;
