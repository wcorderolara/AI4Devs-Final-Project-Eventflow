// US-035 (PB-P1-020 / BE-001, R1) — DTO Zod del bloque `summary` de la vista del presupuesto.
// Alineado con schema real: totales leídos de `Budget.totalPlanned/totalCommitted` (Decimal
// serializado a number) y `currency_code` = `Event.currency` (enum CurrencyCode).
// R1 elimina `paid_total` del contrato: la columna `paid` no existe en el schema actual.
import { z } from 'zod';

// Mirror del enum Prisma `CurrencyCode` (backend/prisma/schema.prisma:37). BR-BUDGET-006.
export const CURRENCY_CODES = ['GTQ', 'EUR', 'MXN', 'COP', 'USD'] as const;

export const budgetSummaryDto = z.object({
  total_planned: z.number().nonnegative(),
  total_committed: z.number().nonnegative(),
  over_committed: z.boolean(),
  currency_code: z.enum(CURRENCY_CODES),
});

export type BudgetSummaryDto = z.infer<typeof budgetSummaryDto>;
