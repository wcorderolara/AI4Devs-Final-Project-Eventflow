// US-035 (PB-P1-020 / OBS-001, R1) — Telemetría del endpoint `GET /events/:id/budget`.
// Emite `budget.viewed` con campos sin PII (SEC-05). Enteros y montos numéricos, `correlationId`
// para correlación end-to-end. R1: sin `paid_total` (columna no existe en schema actual).
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { CurrencyCode } from '../domain/budget-view.js';

export interface BudgetViewedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  currencyCode: CurrencyCode;
  totalPlanned: number;
  totalCommitted: number;
  overCommitted: boolean;
  itemsCount: number;
  latencyMs: number;
}

export class GetBudgetTelemetry {
  emitViewed(evt: BudgetViewedEvent): void {
    logger.info({
      event: 'budget.viewed',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      currency_code: evt.currencyCode,
      total_planned: evt.totalPlanned,
      total_committed: evt.totalCommitted,
      over_committed: evt.overCommitted,
      items_count: evt.itemsCount,
      latency_ms: evt.latencyMs,
    });
  }
}
