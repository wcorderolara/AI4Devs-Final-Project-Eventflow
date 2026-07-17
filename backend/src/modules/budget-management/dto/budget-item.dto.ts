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
  // US-064 (PB-P1-037 / BE-001) — AC-02: delta con signo (`planned - committed`). Negativo
  // cuando `over_committed = true`. Complementa `overcommitted_amount` (siempre ≥ 0) con la
  // info de "cuánto queda" para items no excedidos. `.optional()` para preservar DTOs de test
  // heredados de US-035/US-038; el producer siempre lo incluye.
  diff: z.number().optional(),
  // US-064 (PB-P1-037 / BE-001) — EC-02: heurística `auto_created = planned=0 && committed>0`
  // — detecta ítems creados automáticamente por `UpdateCommittedFromBookingIntentUseCase`
  // (US-039 apply). Tech Spec §7 lo marca como aproximación para MVP; una columna explícita
  // `created_via` en `budget_items` queda como mejora futura (fuera de scope). `.optional()`
  // para preservar DTOs de test heredados.
  auto_created: z.boolean().optional(),
});

export type BudgetItemDto = z.infer<typeof budgetItemDto>;
