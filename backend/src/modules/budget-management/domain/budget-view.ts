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
}
