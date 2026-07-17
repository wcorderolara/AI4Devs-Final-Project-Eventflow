// US-035 (PB-P1-020 / BE-002, R1) — Tipo de dominio de la vista del presupuesto.
// Representa el agregado leído por `BudgetReadRepository.getByEventId` con Decimals ya
// materializados como `number` (los `Decimal` de Prisma se convierten en el mapper del
// use case; el dominio maneja tipos primitivos para simplificar composición y tests).
export type CurrencyCode = 'GTQ' | 'EUR' | 'MXN' | 'COP' | 'USD';

export interface BudgetItemView {
  id: string;
  label: string;
  categoryCode: string | null;
  amountPlanned: number;
  amountCommitted: number;
}

export interface BudgetAggregateView {
  budgetId: string;
  totalPlanned: number;
  totalCommitted: number;
  currency: CurrencyCode;
  items: BudgetItemView[];
  // US-064 (PB-P1-037 / BE-001): timestamp del último UPDATE al aggregate (`Budget.updated_at`
  // vía `@updatedAt` de Prisma). Se expone en el response como `last_updated_at`. `null` es
  // defensa profunda — el schema garantiza no-null en producción.
  updatedAt: Date | null;
}
