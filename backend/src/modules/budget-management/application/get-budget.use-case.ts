// US-035 (PB-P1-020 / BE-003, R1) + US-038 (PB-P1-022 / BE-004) — Use case orquestador de la
// vista del presupuesto.
// Flujo US-035 (base):
//  1. Ownership (masked 404, SEC-06) vía `BudgetReadRepository.isOwnedEvent`.
//  2. Read del agregado `Budget + items + Event.currency` (BE-002).
//  3. Cálculo `over_committed = totalCommitted > totalPlanned` (D4, comparación estricta).
//  4. Composición del response canónico `{ summary, items[] }` (R1 shape).
//  5. Emisión de `budget.viewed` (OBS-001).
//
// Extensión US-038 (BE-004):
//  a. Lookup `CurrencyReadPort.findByCode(event.currency)` para `decimal_places` (D3).
//  b. Fallback defensivo `decimal_places = 2` con log `currency.decimal_places.missing`
//     (EC-05, VR-02) si el código no está catalogado.
//  c. Tolerance adaptativa vía helper puro (`toleranceFromDecimalPlaces`).
//  d. Cálculo de `summary.overcommitted_amount`, `item.over_committed`,
//     `item.overcommitted_amount` (AC-01, AC-02, VR-03).
//  e. Extensión del log `budget.viewed` con `overcommitted_amount` +
//     `over_committed_items_count`.
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import type { BudgetReadRepository } from '../ports/budget-read.repository.js';
import type { CurrencyReadPort } from '../ports/currency-read.port.js';
import type { BudgetSummaryDto, BudgetItemDto } from '../dto/index.js';
import { GetBudgetTelemetry } from './get-budget-telemetry.js';
import {
  calculateOvercommitFields,
  toleranceFromDecimalPlaces,
} from '../domain/overcommit-calculator.js';

export interface GetBudgetInput {
  actorId: string;
  eventId: string;
  correlationId: string;
}

export interface GetBudgetResult {
  summary: BudgetSummaryDto;
  items: BudgetItemDto[];
  // US-064 (BE-001) AC-02/AC-04: ISO 8601 del `Budget.updated_at` para triggerear el aria-live
  // announcement + mostrar "Última actualización" en el frontend.
  last_updated_at: string | null;
}

// Fallback defensivo D3 / VR-02: cuando el código no está catalogado, se asume 2 decimales
// (mayoría de monedas del enum MVP) y se loguea warning para trazabilidad.
const DEFAULT_DECIMAL_PLACES = 2;

export class GetBudgetUseCase {
  constructor(
    private readonly repo: BudgetReadRepository,
    private readonly currencyReader: CurrencyReadPort,
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

    // US-038 D3: lookup decimal_places + fallback defensivo con warning.
    const currency = await this.currencyReader.findByCode(aggregate.currency);
    let decimalPlaces = DEFAULT_DECIMAL_PLACES;
    if (currency === null) {
      this.telemetry.emitCurrencyDecimalPlacesMissing({
        correlationId: input.correlationId,
        eventId: input.eventId,
        currencyCode: aggregate.currency,
        fallbackDecimalPlaces: DEFAULT_DECIMAL_PLACES,
      });
    } else {
      decimalPlaces = currency.decimal_places;
    }
    const tolerance = toleranceFromDecimalPlaces(decimalPlaces);

    // US-035 D4: comparación estricta — igualdad no es exceso.
    const overCommitted = aggregate.totalCommitted > aggregate.totalPlanned;

    // US-038 BE-001: cálculo puro de los campos extendidos.
    const overcommit = calculateOvercommitFields({
      totalPlanned: aggregate.totalPlanned,
      totalCommitted: aggregate.totalCommitted,
      items: aggregate.items.map((item) => ({
        committed: item.amountCommitted,
        planned: item.amountPlanned,
      })),
      tolerance,
    });

    const summary: BudgetSummaryDto = {
      total_planned: aggregate.totalPlanned,
      total_committed: aggregate.totalCommitted,
      over_committed: overCommitted,
      currency_code: aggregate.currency,
      overcommitted_amount: overcommit.summaryOvercommittedAmount,
      // US-064 (BE-001) AC-02: monto disponible con signo. Cuando `over_committed = true` el
      // valor es negativo — la UI lo pinta en rojo. Preserva precisión: el cliente formatea con
      // CLDR según `currency_code`.
      available: aggregate.totalPlanned - aggregate.totalCommitted,
    };

    const items: BudgetItemDto[] = aggregate.items
      .map((item, idx): BudgetItemDto => {
        const flags = overcommit.itemsOvercommit[idx]!;
        return {
          id: item.id,
          label: item.label,
          category_code: item.categoryCode,
          amount_planned: item.amountPlanned,
          amount_committed: item.amountCommitted,
          over_committed: flags.over_committed,
          overcommitted_amount: flags.overcommitted_amount,
          // US-064 (BE-001) AC-02: `diff = planned - committed`, con signo (negativo en items
          // excedidos). Complementa `overcommitted_amount` (siempre ≥ 0) para reportar cuánto
          // queda por comprometer en items sanos.
          diff: item.amountPlanned - item.amountCommitted,
          // US-064 (BE-001) EC-02 — heurística `auto_created`: item con `planned = 0` y
          // `committed > 0`. Detecta ítems creados automáticamente por US-039
          // `UpdateCommittedFromBookingIntentUseCase` al confirmar un BookingIntent cuando no
          // existía BudgetItem previo para `(budget, categoryCode)`. Aproximación aceptable en
          // MVP (Tech Spec §7 admite falsos positivos; una columna explícita `created_via` en
          // `budget_items` queda como mejora futura).
          auto_created: item.amountPlanned === 0 && item.amountCommitted > 0,
        };
      })
      // US-064 (BE-001) AC-02: orden por `amount_committed DESC`. Empates se resuelven por
      // `amount_planned DESC` y luego `id` estable para snapshots deterministas.
      .sort((a, b) => {
        if (b.amount_committed !== a.amount_committed) return b.amount_committed - a.amount_committed;
        if (b.amount_planned !== a.amount_planned) return b.amount_planned - a.amount_planned;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

    const overCommittedItemsCount = items.reduce(
      (acc, item) => (item.over_committed ? acc + 1 : acc),
      0,
    );

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
      overcommittedAmount: overcommit.summaryOvercommittedAmount,
      overCommittedItemsCount,
    });

    return {
      summary,
      items,
      // US-064 (BE-001) AC-02/AC-04: timestamp del `Budget.updated_at` en ISO 8601. El frontend
      // lo compara entre re-fetches para disparar el anuncio aria-live. `null` es defensa
      // profunda (`@updatedAt` de Prisma garantiza no-null en producción).
      last_updated_at: aggregate.updatedAt !== null ? aggregate.updatedAt.toISOString() : null,
    };
  }
}
