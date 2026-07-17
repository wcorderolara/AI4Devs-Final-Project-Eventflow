// US-035 (PB-P1-020 / BE-001, R1) + US-064 (PB-P1-037 / BE-001) — DTO Zod del response canónico
// de la vista de presupuesto.
// Shape: `{ summary: BudgetSummaryDto, items: BudgetItemDto[], last_updated_at: string | null }`.
// Sin `paid_total`, sin `category_name`. AC-04 (R1).
//
// US-064 (AC-02, AC-04): agrega `last_updated_at` como timestamp del `Budget.updated_at` para
// que el frontend pueda mostrar "última actualización" y comparar entre re-fetches (aria-live
// announcement). Puede ser `null` si el `Budget` no tiene `updatedAt` (imposible en producción
// por el `@updatedAt` de Prisma; el `null` es defensa profunda).
import { z } from 'zod';
import { budgetSummaryDto } from './budget-summary.dto.js';
import { budgetItemDto } from './budget-item.dto.js';

export const getBudgetResponseDto = z.object({
  summary: budgetSummaryDto,
  items: z.array(budgetItemDto),
  // `.optional()` para preservar el shape base validado por tests heredados de US-035/US-038.
  // El producer siempre lo incluye (posiblemente `null` como defensa profunda).
  last_updated_at: z.string().datetime().nullable().optional(),
});

export type GetBudgetResponseDto = z.infer<typeof getBudgetResponseDto>;
