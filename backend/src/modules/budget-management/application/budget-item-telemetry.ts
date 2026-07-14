// US-036 (PB-P1-020 / OBS-001, R1) — Telemetría de mutaciones sobre BudgetItem.
// Emite tres eventos estructurados con `correlationId`, `actorId` opaco y montos numéricos
// auditables (SEC-05). Sin PII. `budget.item.deleted` captura el snapshot pre-delete para
// preservar trazabilidad de auditoría (sustituto funcional del soft delete en R1).
import { logger } from '../../../shared/infrastructure/logger/index.js';

export interface BudgetItemCreatedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  budgetId: string;
  itemId: string;
  label: string;
  categoryCode: string | null;
  amountPlanned: number;
  amountCommitted: number;
  latencyMs: number;
}

export interface BudgetItemUpdatedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  itemId: string;
  fieldsChanged: string[];
  latencyMs: number;
}

export interface BudgetItemDeletedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  itemId: string;
  // Snapshot pre-delete (auditoría — sustituto del soft delete en R1).
  label: string;
  categoryCode: string | null;
  amountPlanned: number;
  amountCommitted: number;
  latencyMs: number;
}

export class BudgetItemTelemetry {
  emitCreated(evt: BudgetItemCreatedEvent): void {
    logger.info({
      event: 'budget.item.created',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      budgetId: evt.budgetId,
      itemId: evt.itemId,
      label: evt.label,
      category_code: evt.categoryCode,
      amount_planned: evt.amountPlanned,
      amount_committed: evt.amountCommitted,
      latency_ms: evt.latencyMs,
    });
  }

  emitUpdated(evt: BudgetItemUpdatedEvent): void {
    logger.info({
      event: 'budget.item.updated',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      itemId: evt.itemId,
      fields_changed: evt.fieldsChanged,
      latency_ms: evt.latencyMs,
    });
  }

  emitDeleted(evt: BudgetItemDeletedEvent): void {
    logger.info({
      event: 'budget.item.deleted',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      itemId: evt.itemId,
      label: evt.label,
      category_code: evt.categoryCode,
      amount_planned: evt.amountPlanned,
      amount_committed: evt.amountCommitted,
      latency_ms: evt.latencyMs,
    });
  }
}
