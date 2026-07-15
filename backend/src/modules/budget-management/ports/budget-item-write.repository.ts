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

/**
 * US-037 (PB-P1-021 / BE-003): input para inserción batch de items materializados desde
 * una AIRecommendation. Todos los items comparten `budgetId` y `aiRecommendationId`.
 */
export interface CreateBudgetItemFromAiInput {
  label: string;
  categoryCode: string;
  amountPlanned: number;
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
   * US-039 (PB-P1-023 / BE-005): busca el primer `BudgetItem` activo del budget para la
   * categoría dada (`ServiceCategory.code`). Retorna `null` si no existe. No hay soft delete
   * en `BudgetItem` (ADR-DB-004), por lo que "activo" equivale a "existente".
   */
  findByBudgetAndCategoryCode(
    tx: Prisma.TransactionClient,
    args: { budgetId: string; categoryCode: string },
  ): Promise<BudgetItemRow | null>;

  /**
   * US-039 (PB-P1-023 / BE-005): incrementa atómicamente `amount_committed` (SQL `column + $delta`).
   * PostgreSQL adquiere ROW EXCLUSIVE en el UPDATE; concurrentes se serializan por fila.
   * `delta` DEBE ser > 0. Retorna el nuevo valor.
   */
  incrementCommittedBy(
    tx: Prisma.TransactionClient,
    args: { itemId: string; delta: number },
  ): Promise<BudgetItemRow>;

  /**
   * US-039 (PB-P1-023 / BE-005): decrementa atómicamente `amount_committed`. `delta` DEBE ser > 0.
   * El caller (use case) valida que `committed >= delta` a nivel semántico (el intent guardó
   * `committed_synced_amount` con el valor exacto sumado en el apply).
   */
  decrementCommittedBy(
    tx: Prisma.TransactionClient,
    args: { itemId: string; delta: number },
  ): Promise<BudgetItemRow>;

  /**
   * US-039 (PB-P1-023 / BE-005): `SELECT id FROM budgets WHERE id = $1 FOR UPDATE`.
   * Serializa el "find-or-auto-create" del BudgetItem (D2) entre transacciones concurrentes
   * que apliquen sync sobre el mismo `Budget` (mismo evento).
   */
  lockBudgetForSync(
    tx: Prisma.TransactionClient,
    args: { budgetId: string },
  ): Promise<void>;

  /**
   * US-039 (PB-P1-023 / BE-005): asegura que el evento tenga un Budget asociado. Si ya existe,
   * lo retorna. Si no, lo crea con `totalPlanned=0`, `totalCommitted=0` (creación lazy — el
   * organizer aún no visitó la vista Budget). Idempotente y seguro para concurrencia por la
   * restricción `@unique(eventId)` en `Budget`.
   */
  ensureBudgetForEvent(
    tx: Prisma.TransactionClient,
    args: { eventId: string },
  ): Promise<{ id: string }>;

  /**
   * Recomputa `Budget.totalPlanned` y `Budget.totalCommitted` con `SUM(items.amount*)` y
   * ejecuta `UPDATE budgets`. Se invoca al final de cada mutación (BLK-E compromiso R1 US-035).
   */
  recomputeBudgetTotals(tx: Prisma.TransactionClient, budgetId: string): Promise<void>;

  /**
   * US-037 (D2): retorna los IDs de items ai_generated candidatos a reemplazo:
   * items del mismo `budgetId` cuyo `aiRecommendationId` es NOT NULL y **distinto** del
   * `aiRecommendationId` que estamos aplicando. Los items manuales (aiRecommendationId=NULL)
   * NO se tocan.
   */
  findReplaceableAiItems(
    tx: Prisma.TransactionClient,
    args: { budgetId: string; currentAiRecommendationId: string },
  ): Promise<Array<{ id: string }>>;

  /**
   * US-037: hard delete de un conjunto de itemIds. Respeta ADR-DB-004 (no soft delete en
   * BudgetItem). El auditoría se preserva vía log estructurado emitido por el caller
   * (`budget.ai_suggestion.applied` con `replaced_items_count`).
   */
  hardDeleteMany(tx: Prisma.TransactionClient, itemIds: string[]): Promise<void>;

  /**
   * US-037: crea N items en batch para un `aiRecommendationId`. Retorna los items creados
   * con sus IDs (segundo findMany por `aiRecommendationId` cuando createMany no retorna
   * registros).
   */
  createManyForRecommendation(
    tx: Prisma.TransactionClient,
    args: {
      budgetId: string;
      aiRecommendationId: string;
      items: CreateBudgetItemFromAiInput[];
    },
  ): Promise<BudgetItemRow[]>;
}
