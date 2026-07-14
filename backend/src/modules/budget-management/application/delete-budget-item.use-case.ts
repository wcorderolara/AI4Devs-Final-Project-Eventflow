// US-036 (PB-P1-020 / BE-006, R1) — Use case de eliminación (hard delete) de BudgetItem.
// Flujo (AC-03, AC-04, AC-05, AC-06, VR-07/10):
//  1. Ownership + event status.
//  2. Lee item con cross-event check (SEC-04) → 404 masked.
//  3. Bloqueo `amount_committed > 0` → 409 `ITEM_HAS_COMMITMENT`.
//  4. Cross-module `BookingIntent.pending` (si `category_code` matchea whitelist activa) →
//     409 `ITEM_HAS_PENDING_INTENT`. Edge R1: si `category_code = null` o no matchea, se omite
//     el check (no hay `BookingIntent` posible sin FK).
//  5. Transacción: hard delete + recompute Budget totals (BLK-E).
//  6. Emitir `budget.item.deleted` con snapshot pre-delete (auditoría sustituto del soft delete).
import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  EventNotEditableError,
  ItemHasCommitmentError,
  ItemHasPendingIntentError,
} from '../domain/errors/budget-item.errors.js';
import type { BudgetItemWriteRepository } from '../ports/budget-item-write.repository.js';
import type { BookingIntentReadPort } from '../ports/booking-intent-read.port.js';
import type { ServiceCategoryReadPort } from '../ports/service-category-read.port.js';
import type { EventBudgetContextReader } from '../ports/event-budget-context.reader.js';
import { BudgetItemTelemetry } from './budget-item-telemetry.js';

export interface DeleteBudgetItemInput {
  actorId: string;
  eventId: string;
  itemId: string;
  correlationId: string;
}

export class DeleteBudgetItemUseCase {
  constructor(
    private readonly eventContextReader: EventBudgetContextReader,
    private readonly serviceCategoryReader: ServiceCategoryReadPort,
    private readonly bookingIntentReader: BookingIntentReadPort,
    private readonly writeRepo: BudgetItemWriteRepository,
    private readonly telemetry: BudgetItemTelemetry = new BudgetItemTelemetry(),
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: DeleteBudgetItemInput): Promise<void> {
    const startedAt = this.now();

    // 1. Ownership + event status.
    const ctx = await this.eventContextReader.find(input.eventId, input.actorId);
    if (ctx === null) throw new NotFoundError('Resource not found');
    if (ctx.eventStatus !== 'draft' && ctx.eventStatus !== 'active') {
      throw new EventNotEditableError(ctx.eventStatus);
    }

    // 2. Cross-event check + read del item (con Decimals).
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: input.itemId, budgetId: ctx.budgetId },
      select: {
        id: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    if (item === null) throw new NotFoundError('Resource not found');

    // 3. Bloqueo por committed > 0.
    const committed = item.amountCommitted.toNumber();
    if (committed > 0) throw new ItemHasCommitmentError(committed);

    // 4. Cross-module `BookingIntent.pending`. Edge R1: si `categoryCode` es null o el code no
    //    matchea una `ServiceCategory` activa, no hay `BookingIntent` posible → se omite.
    if (item.categoryCode !== null) {
      const serviceCategoryId = await this.serviceCategoryReader.findIdByCode(item.categoryCode);
      if (serviceCategoryId !== null) {
        const pending = await this.bookingIntentReader.findPendingByEventAndCategory({
          eventId: input.eventId,
          serviceCategoryId,
        });
        if (pending.length > 0) throw new ItemHasPendingIntentError();
      }
    }

    // 5. Transacción: hard delete + recompute totals.
    await this.prisma.$transaction(async (tx) => {
      await this.writeRepo.hardDelete(tx, item.id);
      await this.writeRepo.recomputeBudgetTotals(tx, ctx.budgetId);
    });

    // 6. Telemetría con snapshot pre-delete (auditoría R1 — sustituto funcional del soft delete).
    this.telemetry.emitDeleted({
      correlationId: input.correlationId,
      actorId: input.actorId,
      eventId: input.eventId,
      itemId: item.id,
      label: item.label,
      categoryCode: item.categoryCode,
      amountPlanned: item.amountPlanned.toNumber(),
      amountCommitted: committed,
      latencyMs: this.now() - startedAt,
    });
  }
}
