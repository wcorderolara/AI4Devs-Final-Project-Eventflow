// US-035 (PB-P1-020 / BE-001, R1) — DTO Zod del response canónico de la vista.
// Shape: `{ summary: BudgetSummaryDto, items: BudgetItemDto[] }`. Sin `paid_total`, sin
// `category_name`. AC-04 (R1).
import { z } from 'zod';
import { budgetSummaryDto } from './budget-summary.dto.js';
import { budgetItemDto } from './budget-item.dto.js';

export const getBudgetResponseDto = z.object({
  summary: budgetSummaryDto,
  items: z.array(budgetItemDto),
});

export type GetBudgetResponseDto = z.infer<typeof getBudgetResponseDto>;
