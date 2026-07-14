// US-029 (PB-P1-018 / OBS-001) — Telemetría de las tres mutaciones (Tech Spec §14).
// Emite logs estructurados SIN PII (nunca `title`/`description`/`category_code` literal — SEC-05).
// Las métricas Prometheus (`tasks_updated_total`, `tasks_deleted_total`,
// `tasks_mutate_latency_ms`, `tasks_transition_rejected_total`) quedan como deuda D5 heredada
// hasta que el registry central exista (mismo patrón US-027/US-028). Se emiten los logs con
// `latencyMs` para que el pipeline downstream derive las métricas.
import { logger } from '../../../../shared/infrastructure/logger/index.js';

export interface TasksUpdatedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  aiGenerated: boolean;
  operation: 'content' | 'status';
  fieldsChanged: string[];
  previousStatus?: string;
  newStatus?: string;
  latencyMs: number;
  ignoredFields?: string[];
}

export interface TasksUpdatedNoOpEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  status: string;
  latencyMs: number;
}

export interface TasksMutateBlockedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  operation: 'content' | 'status' | 'delete';
  eventStatus: string;
  latencyMs: number;
}

export interface TasksMutateRejectedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  operation: 'content' | 'status' | 'delete';
  reason: 'invalid_transition' | 'event_not_mutable' | 'not_found' | 'validation' | 'other';
  httpStatus: number;
  errorCode: string;
  latencyMs: number;
  ignoredFields?: string[];
}

export interface TasksDeletedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  aiGenerated: boolean;
  latencyMs: number;
}

export class MutateEventTaskTelemetry {
  emitUpdated(evt: TasksUpdatedEvent): void {
    logger.info({
      event: 'tasks.updated',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      aiGenerated: evt.aiGenerated,
      operation: evt.operation,
      fieldsChanged: evt.fieldsChanged,
      ...(evt.previousStatus !== undefined ? { previousStatus: evt.previousStatus } : {}),
      ...(evt.newStatus !== undefined ? { newStatus: evt.newStatus } : {}),
      latencyMs: evt.latencyMs,
      ...(evt.ignoredFields && evt.ignoredFields.length > 0
        ? { 'body.ignoredFields': evt.ignoredFields }
        : {}),
    });
  }

  emitUpdatedNoOp(evt: TasksUpdatedNoOpEvent): void {
    logger.info({
      event: 'tasks.updated.no_op',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      status: evt.status,
      latencyMs: evt.latencyMs,
    });
  }

  emitBlocked(evt: TasksMutateBlockedEvent): void {
    const eventName =
      evt.operation === 'delete' ? 'tasks.deleted.blocked' : 'tasks.updated.blocked';
    logger.warn({
      event: eventName,
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      operation: evt.operation,
      eventStatus: evt.eventStatus,
      latencyMs: evt.latencyMs,
    });
  }

  emitRejected(evt: TasksMutateRejectedEvent): void {
    logger.warn({
      event: 'tasks.mutate.rejected',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      operation: evt.operation,
      reason: evt.reason,
      httpStatus: evt.httpStatus,
      errorCode: evt.errorCode,
      latencyMs: evt.latencyMs,
      ...(evt.ignoredFields && evt.ignoredFields.length > 0
        ? { 'body.ignoredFields': evt.ignoredFields }
        : {}),
    });
  }

  emitDeleted(evt: TasksDeletedEvent): void {
    logger.info({
      event: 'tasks.deleted',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      aiGenerated: evt.aiGenerated,
      latencyMs: evt.latencyMs,
    });
  }
}
