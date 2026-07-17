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
  // US-038 (PB-P1-022 / BE-003) AC-01: monto bruto del exceso a nivel evento. Siempre presente
  // (0 cuando no hay exceso). VR-03: garantizado ≥ 0 por construcción (Math.max(0, ...)).
  overcommitted_amount: z.number().nonnegative(),
  // US-064 (PB-P1-037 / BE-001) — AC-02: monto disponible del presupuesto (`planned - committed`).
  // Puede ser NEGATIVO cuando `over_committed = true` (el frontend renderiza en rojo para el
  // organizer). Semántica distinta a `overcommitted_amount` (siempre ≥ 0): `available` es un
  // valor con signo — puede ser útil para "cuánto queda o cuánto excede" en la UI. Marcado
  // `.optional()` para no romper contract con los DTOs de test heredados de US-035/US-038 que
  // validan el shape base sin este campo — el producer siempre lo incluye.
  available: z.number().optional(),
});

export type BudgetSummaryDto = z.infer<typeof budgetSummaryDto>;
