// US-036 (PB-P1-020 / BE-002, R1) — Adapter Prisma para `EventBudgetContextReader`.
// Un solo query: `events` con `include: budget` y filtro `userId = ownerId AND deleted_at IS NULL`.
import { prisma } from '../../../shared/infrastructure/prisma/prisma.client.js';
import type {
  EventBudgetContext,
  EventBudgetContextReader,
} from '../ports/event-budget-context.reader.js';

export class PrismaEventBudgetContextReader implements EventBudgetContextReader {
  async find(eventId: string, ownerId: string): Promise<EventBudgetContext | null> {
    const row = await prisma.event.findFirst({
      where: { id: eventId, userId: ownerId, deletedAt: null },
      select: { status: true, budget: { select: { id: true } } },
    });
    if (row === null || row.budget === null) return null;
    return {
      eventStatus: row.status as EventBudgetContext['eventStatus'],
      budgetId: row.budget.id,
    };
  }
}
