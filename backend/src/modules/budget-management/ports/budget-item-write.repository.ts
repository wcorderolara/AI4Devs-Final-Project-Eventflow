// US-036 (PB-P1-020 / BE-003, R1) — Port del write repository de BudgetItem.
// Todos los métodos reciben un `Prisma.TransactionClient` provisto por el use case
// (compromiso BLK-E: mutaciones + recompute de totales se ejecutan en la misma transacción).
import type { Prisma } from '@prisma/client';

export interface BudgetItemRow {
  id: string;
  budgetId: string;
  label: string;
  categoryCode: string | null;
  amountPlanned: number;
  amountCommitted: number;
}

export interface CreateBudgetItemInput {
  budgetId: string;
  label: string;
  categoryCode: string | null;
  amountPlanned: number;
  amountCommitted: number;
}

export interface UpdateBudgetItemInput {
  label?: string;
  categoryCode?: string | null;
  amountPlanned?: number;
}

export interface BudgetItemWriteRepository {
  create(tx: Prisma.TransactionClient, input: CreateBudgetItemInput): Promise<BudgetItemRow>;
  update(
    tx: Prisma.TransactionClient,
    itemId: string,
    input: UpdateBudgetItemInput,
  ): Promise<BudgetItemRow>;
  hardDelete(tx: Prisma.TransactionClient, itemId: string): Promise<void>;
  /**
   * Recomputa `Budget.totalPlanned` y `Budget.totalCommitted` con `SUM(items.amount*)` y
   * ejecuta `UPDATE budgets`. Se invoca al final de cada mutación (BLK-E compromiso R1 US-035).
   */
  recomputeBudgetTotals(tx: Prisma.TransactionClient, budgetId: string): Promise<void>;
}
