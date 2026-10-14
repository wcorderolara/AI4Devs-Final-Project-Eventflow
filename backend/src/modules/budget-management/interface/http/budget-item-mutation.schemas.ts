// US-036 (PB-P1-020 / BE-007, R1) — Schemas Zod de path params para las 3 mutaciones.
// Body schemas viven en `dto/create-budget-item.body.ts` y `dto/update-budget-item.body.ts`.
import { uuidParamsSchema } from '../../../../shared/validation/uuid-params.js';

export const createBudgetItemParamsSchema = uuidParamsSchema('eventId').strip();

export const updateBudgetItemParamsSchema = uuidParamsSchema('eventId', 'itemId').strip();

export const deleteBudgetItemParamsSchema = updateBudgetItemParamsSchema;
