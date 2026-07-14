// US-031 (PB-P1-017 / OBS-001) — Telemetría del bulk confirm HITL.
// Emite 5 logs estructurados (`requested|succeeded|partial_failed|rejected|conflict`) sobre el
// logger central (`shared/infrastructure/logger`). Los logs incluyen sólo IDs y agregados; nunca
// `task.title` ni PII (SEC-06). Contadores en memoria funcionan como métricas mínimas
// consultables por tests; en producción se cablean a Prometheus (fuera del alcance MVP local
// — ver Doc §17 Risks: métricas Prometheus se instrumentan cuando la fundación observabilidad
// las materialice; hoy la instrumentación estructurada equivalente vive en `logger.info`).
import { logger } from '../../../../shared/infrastructure/logger/index.js';
import type { BulkItemErrorCode } from '../dto/confirm-bulk.dto.js';

export type BulkConfirmOutcome = 'success' | 'partial' | 'rejected';

export interface BulkConfirmRequestedFields {
  correlationId?: string;
  eventId: string;
  actorId: string;
  requestedCount: number;
  dedupedCount: number;
}

export interface BulkConfirmSucceededFields extends BulkConfirmRequestedFields {
  acceptedCount: number;
  latencyMs: number;
}

export interface BulkConfirmPartialFields extends BulkConfirmSucceededFields {
  rejectedCount: number;
  errorCodesSummary: Partial<Record<BulkItemErrorCode, number>>;
}

export interface BulkConfirmRejectedFields {
  correlationId?: string;
  eventId?: string;
  actorId?: string;
  reason: 'admin_excluded' | 'not_owner' | 'validation' | 'bulk_limit_exceeded';
}

export interface BulkConfirmConflictFields {
  correlationId?: string;
  eventId: string;
  eventStatus: string;
}

interface BulkConfirmMetricsSnapshot {
  totals: Record<BulkConfirmOutcome, number>;
  acceptedTotal: number;
  rejectedByCode: Record<BulkItemErrorCode, number>;
  batchSizes: number[];
  latencies: number[];
}

export class BulkConfirmTelemetry {
  private readonly metrics: BulkConfirmMetricsSnapshot = {
    totals: { success: 0, partial: 0, rejected: 0 },
    acceptedTotal: 0,
    rejectedByCode: {
      TASK_NOT_FOUND: 0,
      TASK_NOT_IN_EVENT: 0,
      TASK_NOT_AI: 0,
      TASK_NOT_PENDING: 0,
    },
    batchSizes: [],
    latencies: [],
  };

  requested(f: BulkConfirmRequestedFields): void {
    logger.info({
      event: 'tasks.bulk_confirm.requested',
      correlation_id: f.correlationId,
      event_id: f.eventId,
      actor_id: f.actorId,
      requested_count: f.requestedCount,
      deduped_count: f.dedupedCount,
    });
    this.metrics.batchSizes.push(f.dedupedCount);
  }

  succeeded(f: BulkConfirmSucceededFields): void {
    logger.info({
      event: 'tasks.bulk_confirm.succeeded',
      correlation_id: f.correlationId,
      event_id: f.eventId,
      actor_id: f.actorId,
      accepted_count: f.acceptedCount,
      latency_ms: f.latencyMs,
    });
    this.metrics.totals.success += 1;
    this.metrics.acceptedTotal += f.acceptedCount;
    this.metrics.latencies.push(f.latencyMs);
  }

  partialFailed(f: BulkConfirmPartialFields): void {
    logger.info({
      event: 'tasks.bulk_confirm.partial_failed',
      correlation_id: f.correlationId,
      event_id: f.eventId,
      actor_id: f.actorId,
      accepted_count: f.acceptedCount,
      rejected_count: f.rejectedCount,
      error_codes_summary: f.errorCodesSummary,
      latency_ms: f.latencyMs,
    });
    this.metrics.totals.partial += 1;
    this.metrics.acceptedTotal += f.acceptedCount;
    this.metrics.latencies.push(f.latencyMs);
    for (const [code, count] of Object.entries(f.errorCodesSummary)) {
      const key = code as BulkItemErrorCode;
      this.metrics.rejectedByCode[key] += count ?? 0;
    }
  }

  rejected(f: BulkConfirmRejectedFields): void {
    logger.warn({
      event: 'tasks.bulk_confirm.rejected',
      correlation_id: f.correlationId,
      event_id: f.eventId,
      actor_id: f.actorId,
      reason: f.reason,
    });
    this.metrics.totals.rejected += 1;
  }

  conflict(f: BulkConfirmConflictFields): void {
    logger.warn({
      event: 'tasks.bulk_confirm.conflict',
      correlation_id: f.correlationId,
      event_id: f.eventId,
      event_status: f.eventStatus,
    });
  }

  snapshot(): BulkConfirmMetricsSnapshot {
    return {
      totals: { ...this.metrics.totals },
      acceptedTotal: this.metrics.acceptedTotal,
      rejectedByCode: { ...this.metrics.rejectedByCode },
      batchSizes: [...this.metrics.batchSizes],
      latencies: [...this.metrics.latencies],
    };
  }
}
