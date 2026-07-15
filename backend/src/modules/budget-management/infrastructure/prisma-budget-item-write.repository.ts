// US-036 (PB-P1-020 / BE-003, R1) — Adapter Prisma del write repository de BudgetItem.
// Todos los métodos aceptan un `Prisma.TransactionClient` provisto por el use case.
// `recomputeBudgetTotals` implementa el compromiso R1 US-035 (BLK-E): mantener consistentes
// `Budget.totalPlanned`/`totalCommitted` (materializados por PB-P0-001) con `SUM(items.*)`.
import type { Prisma } from '@prisma/client';
import type {
  BudgetItemWriteRepository,
  BudgetItemRow,
  CreateBudgetItemInput,
  CreateBudgetItemFromAiInput,
  UpdateBudgetItemInput,
} from '../ports/budget-item-write.repository.js';

function toRow(item: {
  id: string;
  budgetId: string;
  label: string;
  categoryCode: string | null;
  amountPlanned: Prisma.Decimal;
  amountCommitted: Prisma.Decimal;
}): BudgetItemRow {
  return {
    id: item.id,
    budgetId: item.budgetId,
    label: item.label,
    categoryCode: item.categoryCode,
    amountPlanned: item.amountPlanned.toNumber(),
    amountCommitted: item.amountCommitted.toNumber(),
  };
}

export class PrismaBudgetItemWriteRepository implements BudgetItemWriteRepository {
  async create(
    tx: Prisma.TransactionClient,
    input: CreateBudgetItemInput,
  ): Promise<BudgetItemRow> {
    const created = await tx.budgetItem.create({
      data: {
        budgetId: input.budgetId,
        label: input.label,
        categoryCode: input.categoryCode,
        amountPlanned: input.amountPlanned,
        amountCommitted: input.amountCommitted,
      },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    return toRow(created);
  }

  async update(
    tx: Prisma.TransactionClient,
    itemId: string,
    input: UpdateBudgetItemInput,
  ): Promise<BudgetItemRow> {
    const data: Prisma.BudgetItemUpdateInput = {};
    if (input.label !== undefined) data.label = input.label;
    if (input.categoryCode !== undefined) data.categoryCode = input.categoryCode;
    if (input.amountPlanned !== undefined) data.amountPlanned = input.amountPlanned;

    const updated = await tx.budgetItem.update({
      where: { id: itemId },
      data,
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    return toRow(updated);
  }

  async hardDelete(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
    // R1: hard delete. El schema `BudgetItem` no declara `deletedAt` (ADR-DB-004).
    // Auditoría se preserva vía log estructurado `budget.item.deleted` con snapshot pre-delete
    // + PostgreSQL WAL / point-in-time recovery.
    await tx.budgetItem.delete({ where: { id: itemId } });
  }

  async findByBudgetAndCategoryCode(
    tx: Prisma.TransactionClient,
    args: { budgetId: string; categoryCode: string },
  ): Promise<BudgetItemRow | null> {
    const item = await tx.budgetItem.findFirst({
      where: { budgetId: args.budgetId, categoryCode: args.categoryCode },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    return item ? toRow(item) : null;
  }

  async incrementCommittedBy(
    tx: Prisma.TransactionClient,
    args: { itemId: string; delta: number },
  ): Promise<BudgetItemRow> {
    const updated = await tx.budgetItem.update({
      where: { id: args.itemId },
      data: { amountCommitted: { increment: args.delta } },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    return toRow(updated);
  }

  async decrementCommittedBy(
    tx: Prisma.TransactionClient,
    args: { itemId: string; delta: number },
  ): Promise<BudgetItemRow> {
    const updated = await tx.budgetItem.update({
      where: { id: args.itemId },
      data: { amountCommitted: { decrement: args.delta } },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    return toRow(updated);
  }

  async lockBudgetForSync(
    tx: Prisma.TransactionClient,
    args: { budgetId: string },
  ): Promise<void> {
    // Serializa el "find-or-auto-create" del BudgetItem (D2) entre confirmaciones concurrentes
    // sobre el mismo `Budget`. El lock se libera al cerrar la transacción del invocador.
    await tx.$queryRaw`SELECT id FROM budgets WHERE id = ${args.budgetId}::uuid FOR UPDATE`;
  }

  async recomputeBudgetTotals(
    tx: Prisma.TransactionClient,
    budgetId: string,
  ): Promise<void> {
    // BLK-E (compromiso R1 US-035): consistencia atómica de totales denormalizados.
    // Un solo aggregate sobre `budget_items` (Index Scan por budget_id) + UPDATE por PK.
    const agg = await tx.budgetItem.aggregate({
      where: { budgetId },
      _sum: { amountPlanned: true, amountCommitted: true },
    });
    await tx.budget.update({
      where: { id: budgetId },
      data: {
        totalPlanned: agg._sum.amountPlanned ?? 0,
        totalCommitted: agg._sum.amountCommitted ?? 0,
      },
    });
  }

  async findReplaceableAiItems(
    tx: Prisma.TransactionClient,
    args: { budgetId: string; currentAiRecommendationId: string },
  ): Promise<Array<{ id: string }>> {
    // US-037 D2: items del mismo budget con aiRecommendationId != NULL y != actual.
    return tx.budgetItem.findMany({
      where: {
        budgetId: args.budgetId,
        aiRecommendationId: { not: null, notIn: [args.currentAiRecommendationId] },
      },
      select: { id: true },
    });
  }

  async hardDeleteMany(
    tx: Prisma.TransactionClient,
    itemIds: string[],
  ): Promise<void> {
    if (itemIds.length === 0) return;
    await tx.budgetItem.deleteMany({ where: { id: { in: itemIds } } });
  }

  async createManyForRecommendation(
    tx: Prisma.TransactionClient,
    args: {
      budgetId: string;
      aiRecommendationId: string;
      items: CreateBudgetItemFromAiInput[];
    },
  ): Promise<BudgetItemRow[]> {
    if (args.items.length === 0) return [];
    await tx.budgetItem.createMany({
      data: args.items.map((it) => ({
        budgetId: args.budgetId,
        label: it.label,
        categoryCode: it.categoryCode,
        amountPlanned: it.amountPlanned,
        amountCommitted: 0,
        aiRecommendationId: args.aiRecommendationId,
      })),
    });
    // createMany no retorna registros; segundo findMany por (budgetId, aiRecommendationId).
    const created = await tx.budgetItem.findMany({
      where: { budgetId: args.budgetId, aiRecommendationId: args.aiRecommendationId },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return created.map(toRow);
  }
}
