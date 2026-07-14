// US-035 (PB-P1-020 / BE-002, R1) — Implementación Prisma del port de lectura del presupuesto.
// - Ownership: SELECT en `events` con `id=$eventId AND user_id=$ownerId AND deleted_at IS NULL`
//   (patrón US-027 / task-management, SEC-06 masked 404).
// - Read: `prisma.budget.findUnique({ where: { eventId }, include: { items, event: currency } })`.
//   PB-P0-001 declara `budgets.event_id` unique (Index Scan O(1)) y `budget_items.budget_id`
//   índice (Index Scan O(k), k = items del evento). Consulta de `Event.currency` vía la relación.
// - Decimals: se convierten a `number` en el mapper para simplificar el use case y los tests.
import { prisma } from '../../../shared/infrastructure/prisma/prisma.client.js';
import type { BudgetReadRepository } from '../ports/budget-read.repository.js';
import type {
  BudgetAggregateView,
  BudgetItemView,
  CurrencyCode,
} from '../domain/budget-view.js';
import type { Prisma } from '@prisma/client';

export class PrismaBudgetReadRepository implements BudgetReadRepository {
  async isOwnedEvent(eventId: string, ownerId: string): Promise<boolean> {
    const found = await prisma.event.findFirst({
      where: { id: eventId, userId: ownerId, deletedAt: null },
      select: { id: true },
    });
    return found !== null;
  }

  async getByEventId(eventId: string): Promise<BudgetAggregateView | null> {
    const budget = await prisma.budget.findUnique({
      where: { eventId },
      include: {
        items: {
          select: {
            id: true,
            label: true,
            categoryCode: true,
            amountPlanned: true,
            amountCommitted: true,
          },
          // Orden estable para snapshots / evidencia (AC-01: renderiza tabla).
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        event: { select: { currency: true } },
      },
    });
    if (budget === null) return null;

    const items: BudgetItemView[] = budget.items.map((item) => ({
      id: item.id,
      label: item.label,
      categoryCode: item.categoryCode,
      amountPlanned: decimalToNumber(item.amountPlanned),
      amountCommitted: decimalToNumber(item.amountCommitted),
    }));

    return {
      budgetId: budget.id,
      totalPlanned: decimalToNumber(budget.totalPlanned),
      totalCommitted: decimalToNumber(budget.totalCommitted),
      currency: budget.event.currency as CurrencyCode,
      items,
    };
  }
}

/**
 * Convierte un `Prisma.Decimal` a `number` de forma segura para montos monetarios ≤ 14
 * dígitos significativos con 2 decimales (schema §Budget). Los valores del schema tienen
 * default 0; el conversor es tolerante a `null`/`undefined` para robustez de tests.
 */
function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  // `Prisma.Decimal` expone `.toNumber()`. En tests con objetos plain se usa `Number(value)`.
  const maybeDecimal = value as { toNumber?: () => number };
  if (typeof maybeDecimal.toNumber === 'function') return maybeDecimal.toNumber();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
