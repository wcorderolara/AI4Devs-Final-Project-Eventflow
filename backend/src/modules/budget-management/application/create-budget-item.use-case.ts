// US-036 (PB-P1-020 / BE-004, R1) — Use case de creación de BudgetItem.
// Flujo (AC-01, AC-06, VR-03, VR-10):
//  1. Ownership + event status (masked 404 / EVENT_NOT_EDITABLE).
//  2. Validación de `category_code` contra whitelist activa (INVALID_CATEGORY_CODE).
//  3. Transacción: create item + recompute Budget totals (BLK-E).
//  4. Emitir `budget.item.created`.
//  5. Retorna `BudgetItemDto` (shape R1).
import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  EventNotEditableError,
  InvalidCategoryCodeError,
} from '../domain/errors/budget-item.errors.js';
import type { BudgetItemDto } from '../dto/index.js';
import type { CreateBudgetItemBody } from '../dto/create-budget-item.body.js';
import type { BudgetItemWriteRepository } from '../ports/budget-item-write.repository.js';
import type { ServiceCategoryReadPort } from '../ports/service-category-read.port.js';
import type { EventBudgetContextReader } from '../ports/event-budget-context.reader.js';
import { BudgetItemTelemetry } from './budget-item-telemetry.js';

export interface CreateBudgetItemInput {
  actorId: string;
  eventId: string;
  body: CreateBudgetItemBody;
  correlationId: string;
}

export class CreateBudgetItemUseCase {
  constructor(
    private readonly eventContextReader: EventBudgetContextReader,
    private readonly serviceCategoryReader: ServiceCategoryReadPort,
    private readonly writeRepo: BudgetItemWriteRepository,
    private readonly telemetry: BudgetItemTelemetry = new BudgetItemTelemetry(),
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: CreateBudgetItemInput): Promise<BudgetItemDto> {
    const startedAt = this.now();

    // 1. Ownership + event status.
    const ctx = await this.eventContextReader.find(input.eventId, input.actorId);
    if (ctx === null) throw new NotFoundError('Resource not found');
    if (ctx.eventStatus !== 'draft' && ctx.eventStatus !== 'active') {
      throw new EventNotEditableError(ctx.eventStatus);
    }

    // 2. Whitelist de `category_code` (si presente y no null).
    const rawCategoryCode = input.body.category_code;
    const categoryCode = rawCategoryCode === undefined ? null : rawCategoryCode;
    if (categoryCode !== null) {
      const active = await this.serviceCategoryReader.getActiveCodes();
      if (!active.has(categoryCode)) throw new InvalidCategoryCodeError(categoryCode);
    }

    // 3. Transacción: create + recompute totales (BLK-E).
    const created = await this.prisma.$transaction(async (tx) => {
      const item = await this.writeRepo.create(tx, {
        budgetId: ctx.budgetId,
        label: input.body.label,
        categoryCode,
        amountPlanned: input.body.amount_planned,
        amountCommitted: input.body.amount_committed ?? 0,
      });
      await this.writeRepo.recomputeBudgetTotals(tx, ctx.budgetId);
      return item;
    });

    // 4. Telemetría.
    this.telemetry.emitCreated({
      correlationId: input.correlationId,
      actorId: input.actorId,
      eventId: input.eventId,
      budgetId: ctx.budgetId,
      itemId: created.id,
      label: created.label,
      categoryCode: created.categoryCode,
      amountPlanned: created.amountPlanned,
      amountCommitted: created.amountCommitted,
      latencyMs: this.now() - startedAt,
    });

    return {
      id: created.id,
      label: created.label,
      category_code: created.categoryCode,
      amount_planned: created.amountPlanned,
      amount_committed: created.amountCommitted,
    };
  }
}
