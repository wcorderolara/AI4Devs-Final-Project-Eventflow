// US-036 (PB-P1-020 / BE-005, R1) — Use case de actualización de BudgetItem.
// Flujo (AC-02, AC-06, AC-07, VR-04/05/07/10):
//  1. Ownership + event status.
//  2. Lee item con `include budget` — cross-event check (SEC-04) → 404 masked.
//  3. Si `category_code` cambia: whitelist activa + D5 (`amount_committed === 0`).
//  4. Transacción: update item + recompute Budget totals (solo si `amount_planned` cambió — el
//     total_committed no se toca en PATCH porque `amount_committed` no es editable).
//  5. Emitir `budget.item.updated` con `fields_changed`.
//  6. Retorna `BudgetItemDto`.
import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../infrastructure/prisma/client.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import {
  EventNotEditableError,
  InvalidCategoryCodeError,
  ItemCategoryLockedError,
} from '../domain/errors/budget-item.errors.js';
import type { BudgetItemDto } from '../dto/index.js';
import type { UpdateBudgetItemBody } from '../dto/update-budget-item.body.js';
import type { BudgetItemWriteRepository } from '../ports/budget-item-write.repository.js';
import type { ServiceCategoryReadPort } from '../ports/service-category-read.port.js';
import type { EventBudgetContextReader } from '../ports/event-budget-context.reader.js';
import { BudgetItemTelemetry } from './budget-item-telemetry.js';

export interface UpdateBudgetItemInput {
  actorId: string;
  eventId: string;
  itemId: string;
  body: UpdateBudgetItemBody;
  correlationId: string;
}

export class UpdateBudgetItemUseCase {
  constructor(
    private readonly eventContextReader: EventBudgetContextReader,
    private readonly serviceCategoryReader: ServiceCategoryReadPort,
    private readonly writeRepo: BudgetItemWriteRepository,
    private readonly telemetry: BudgetItemTelemetry = new BudgetItemTelemetry(),
    private readonly prisma: PrismaClient = defaultPrisma,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: UpdateBudgetItemInput): Promise<BudgetItemDto> {
    const startedAt = this.now();

    // 1. Ownership + event status.
    const ctx = await this.eventContextReader.find(input.eventId, input.actorId);
    if (ctx === null) throw new NotFoundError('Resource not found');
    if (ctx.eventStatus !== 'draft' && ctx.eventStatus !== 'active') {
      throw new EventNotEditableError(ctx.eventStatus);
    }

    // 2. Lee item con budget para cross-event check (SEC-04). Si no existe o pertenece a
    //    otro budget/evento → 404 masked (VR-07).
    const existing = await this.prisma.budgetItem.findFirst({
      where: { id: input.itemId, budgetId: ctx.budgetId },
      select: {
        id: true,
        budgetId: true,
        label: true,
        categoryCode: true,
        amountPlanned: true,
        amountCommitted: true,
      },
    });
    if (existing === null) throw new NotFoundError('Resource not found');

    // 3. Cambio de `category_code`: whitelist + D5.
    const categoryCodeChanged =
      input.body.category_code !== undefined &&
      (input.body.category_code ?? null) !== existing.categoryCode;
    if (categoryCodeChanged) {
      const newCode = input.body.category_code ?? null;
      if (newCode !== null) {
        const active = await this.serviceCategoryReader.getActiveCodes();
        if (!active.has(newCode)) throw new InvalidCategoryCodeError(newCode);
      }
      const committed = existing.amountCommitted.toNumber();
      if (committed > 0) throw new ItemCategoryLockedError(committed);
    }

    // 4. Transacción.
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await this.writeRepo.update(tx, input.itemId, {
        label: input.body.label,
        categoryCode: categoryCodeChanged ? input.body.category_code ?? null : undefined,
        amountPlanned: input.body.amount_planned,
      });
      // Recompute solo si `amount_planned` cambió (los otros campos no afectan totales).
      if (input.body.amount_planned !== undefined) {
        await this.writeRepo.recomputeBudgetTotals(tx, ctx.budgetId);
      }
      return item;
    });

    // 5. Telemetría con fields_changed.
    const fieldsChanged: string[] = [];
    if (input.body.label !== undefined) fieldsChanged.push('label');
    if (categoryCodeChanged) fieldsChanged.push('category_code');
    if (input.body.amount_planned !== undefined) fieldsChanged.push('amount_planned');
    this.telemetry.emitUpdated({
      correlationId: input.correlationId,
      actorId: input.actorId,
      eventId: input.eventId,
      itemId: updated.id,
      fieldsChanged,
      latencyMs: this.now() - startedAt,
    });

    // US-038 (PB-P1-022 / BE-003): shape extendido forward-compat. La bandera per-item se
    // deriva puntualmente (tolerancia MVP = 0.01, todas las monedas del enum). El GET del
    // summary aplica la tolerancia adaptativa completa.
    const itemDelta = updated.amountCommitted - updated.amountPlanned;
    return {
      id: updated.id,
      label: updated.label,
      category_code: updated.categoryCode,
      amount_planned: updated.amountPlanned,
      amount_committed: updated.amountCommitted,
      over_committed: itemDelta > 0.01,
      overcommitted_amount: Math.max(0, itemDelta),
    };
  }
}
