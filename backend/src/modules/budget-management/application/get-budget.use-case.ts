// US-035 (PB-P1-020 / BE-003, R1) — Use case orquestador de la vista del presupuesto.
// Flujo:
//  1. Ownership (masked 404, SEC-06) vía `BudgetReadRepository.isOwnedEvent`.
//  2. Read del agregado `Budget + items + Event.currency` (BE-002).
//  3. Cálculo `over_committed = totalCommitted > totalPlanned` (comparación estricta —
//     igualdad NO es exceso).
//  4. Composición del response canónico `{ summary, items[] }` (R1 shape).
//  5. Emisión de `budget.viewed` (OBS-001).
// El use case NO consulta `event.status` (AC-06 / SEC-04); la autorización ya ocurrió en
// el ownership guard.
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { BudgetReadRepository } from '../ports/budget-read.repository.js';
import type { BudgetSummaryDto, BudgetItemDto } from '../dto/index.js';
import { GetBudgetTelemetry } from './get-budget-telemetry.js';

export interface GetBudgetInput {
  actorId: string;
  eventId: string;
  correlationId: string;
}

export interface GetBudgetResult {
  summary: BudgetSummaryDto;
  items: BudgetItemDto[];
}

export class GetBudgetUseCase {
  constructor(
    private readonly repo: BudgetReadRepository,
    private readonly telemetry: GetBudgetTelemetry = new GetBudgetTelemetry(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  async execute(input: GetBudgetInput): Promise<GetBudgetResult> {
    const startedAt = this.now();

    // SEC-06 masked 404: evento ajeno / inexistente / soft-deleted colapsan en 404.
    const owned = await this.repo.isOwnedEvent(input.eventId, input.actorId);
    if (!owned) throw new NotFoundError('Resource not found');

    const aggregate = await this.repo.getByEventId(input.eventId);
    // Caso borde: viola BR-BUDGET-001 (wizard debe crear Budget). Se traduce a 404 para no
    // filtrar detalles internos.
    if (aggregate === null) throw new NotFoundError('Resource not found');

    // AC-03 / D4: comparación estricta — igualdad no es exceso.
    const overCommitted = aggregate.totalCommitted > aggregate.totalPlanned;

    const summary: BudgetSummaryDto = {
      total_planned: aggregate.totalPlanned,
      total_committed: aggregate.totalCommitted,
      over_committed: overCommitted,
      currency_code: aggregate.currency,
    };

    const items: BudgetItemDto[] = aggregate.items.map((item) => ({
      id: item.id,
      label: item.label,
      category_code: item.categoryCode,
      amount_planned: item.amountPlanned,
      amount_committed: item.amountCommitted,
    }));

    this.telemetry.emitViewed({
      correlationId: input.correlationId,
      actorId: input.actorId,
      eventId: input.eventId,
      currencyCode: aggregate.currency,
      totalPlanned: aggregate.totalPlanned,
      totalCommitted: aggregate.totalCommitted,
      overCommitted,
      itemsCount: items.length,
      latencyMs: this.now() - startedAt,
    });

    return { summary, items };
  }
}
