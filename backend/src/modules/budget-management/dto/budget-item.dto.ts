// US-035 (PB-P1-020 / BE-001, R1) — DTO Zod del ítem individual del presupuesto.
// Alineado con schema real (`BudgetItem`, backend/prisma/schema.prisma:492): `label`,
// `categoryCode` (nullable, string libre — sin FK a ServiceCategory), `amountPlanned`,
// `amountCommitted`. R1 elimina `paid`, `ai_generated`, `service_category_id` del contrato.
import { z } from 'zod';

export const budgetItemDto = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
  category_code: z.string().nullable(),
  amount_planned: z.number().nonnegative(),
  amount_committed: z.number().nonnegative(),
  // US-038 (PB-P1-022 / BE-003) AC-01/AC-03: bandera + delta per-item. Siempre presentes
  // (false / 0 cuando no aplica). VR-03: `overcommitted_amount` ≥ 0.
  over_committed: z.boolean(),
  overcommitted_amount: z.number().nonnegative(),
});

export type BudgetItemDto = z.infer<typeof budgetItemDto>;
