// US-028 (PB-P1-018 / OBS-001) — Telemetría del endpoint de creación manual.
// Emite log estructurado `tasks.created` sin PII (`title`/`description` NUNCA se emiten, SEC-06)
// y expone métricas Prometheus (counter + histograma). El registry Prometheus central no existe
// aún en el repo (deuda de plataforma D5 heredada de US-027); se emite el log con `latencyMs` y
// `statusCode` para permitir derivar las métricas downstream desde el pipeline de logs.
import { logger } from '../../../../shared/infrastructure/logger/index.js';

export interface TasksCreatedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  taskId: string;
  aiGenerated: false;
  hasDueDate: boolean;
  hasCategory: boolean;
  languageCode: 'es_LATAM' | 'es_ES' | 'pt' | 'en';
  latencyMs: number;
  statusCode: number;
  ignoredFields?: string[];
}

export interface TasksCreateFailedEvent {
  correlationId: string;
  actorId: string;
  eventId: string;
  errorCode: string;
  httpStatus: number;
  latencyMs: number;
  ignoredFields?: string[];
}

export class CreateEventTaskTelemetry {
  emitCreated(evt: TasksCreatedEvent): void {
    logger.info({
      event: 'tasks.created',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      taskId: evt.taskId,
      aiGenerated: evt.aiGenerated,
      hasDueDate: evt.hasDueDate,
      hasCategory: evt.hasCategory,
      languageCode: evt.languageCode,
      latencyMs: evt.latencyMs,
      statusCode: evt.statusCode,
      ...(evt.ignoredFields && evt.ignoredFields.length > 0
        ? { 'body.ignoredFields': evt.ignoredFields }
        : {}),
    });
  }

  emitFailed(evt: TasksCreateFailedEvent): void {
    logger.warn({
      event: 'tasks.create.failed',
      correlationId: evt.correlationId,
      actorId: evt.actorId,
      eventId: evt.eventId,
      errorCode: evt.errorCode,
      httpStatus: evt.httpStatus,
      latencyMs: evt.latencyMs,
      ...(evt.ignoredFields && evt.ignoredFields.length > 0
        ? { 'body.ignoredFields': evt.ignoredFields }
        : {}),
    });
  }
}
