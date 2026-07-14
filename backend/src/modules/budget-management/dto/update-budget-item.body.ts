// US-036 (PB-P1-020 / BE-001, R1) — Body Zod para PATCH /events/:eventId/budget/items/:itemId.
// `.strict()` + campos opcionales: `amount_committed`, `paid`, `ai_generated`,
// `service_category_id` NO se declaran → si el cliente los envía, VALIDATION_ERROR (400).
// R1: `label`, `category_code`, `amount_planned` son los únicos editables.
import { z } from 'zod';

export const updateBudgetItemBodySchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    category_code: z.string().min(1).max(64).nullable().optional(),
    amount_planned: z.number().nonnegative().optional(),
  })
  .strict();

export type UpdateBudgetItemBody = z.infer<typeof updateBudgetItemBodySchema>;
