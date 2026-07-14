// US-036 (PB-P1-020 / BE-007, R1) — Schemas Zod de path params para las 3 mutaciones.
// Body schemas viven en `dto/create-budget-item.body.ts` y `dto/update-budget-item.body.ts`.
import { z } from 'zod';

export const createBudgetItemParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const updateBudgetItemParamsSchema = z.object({
  eventId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export const deleteBudgetItemParamsSchema = updateBudgetItemParamsSchema;
