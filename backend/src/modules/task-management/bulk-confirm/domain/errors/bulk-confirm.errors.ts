// US-031 (PB-P1-017 / BE-006) — Errores de dominio del bulk confirm HITL.
// Los errores globales se mapean a HTTP en el error handler central. Los errores por ítem
// NUNCA se lanzan: se incrustan en `results[i].error` del DTO de respuesta.
import { AppError } from '../../../../../shared/domain/errors/app.error.js';
import { ErrorCodes } from '../../../../../shared/domain/errors/error-codes.js';

/** 400 BULK_LIMIT_EXCEEDED — `taskIds` (post-dedup) > 50 (EC-07). */
export class BulkLimitExceededError extends AppError {
  readonly code = ErrorCodes.BULK_LIMIT_EXCEEDED;
  readonly limit: number;
  readonly received: number;
  constructor(received: number, limit = 50) {
    super(`taskIds exceeds bulk limit (received=${received}, limit=${limit})`);
    this.limit = limit;
    this.received = received;
  }
}

/** 409 EVENT_NOT_MUTABLE — evento `cancelled`/`completed`/soft-deleted (EC-09). */
export class EventNotMutableError extends AppError {
  readonly code = ErrorCodes.EVENT_NOT_MUTABLE;
  readonly eventStatus: string;
  constructor(eventStatus: string) {
    super(`Event is not mutable (status=${eventStatus})`);
    this.eventStatus = eventStatus;
  }
}
