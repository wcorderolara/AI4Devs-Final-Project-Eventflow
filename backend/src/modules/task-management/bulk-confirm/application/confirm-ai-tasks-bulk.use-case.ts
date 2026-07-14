// US-031 (PB-P1-017 / BE-003) — Use case del bulk confirm HITL.
// Orquesta: dedup silencioso (AC-03) → validación defensiva del límite (EC-07) → carga owner-scoped
// del evento con no-revelación → verificación de mutabilidad (EC-09) → loop secuencial por ítem
// con micro-transacción de fila (AC-01, AC-02, AC-04, AC-05, EC-10) → agregación de resultados y
// telemetría (OBS). NO abre transacción global (decisión PO PB-P1-017: sin all-or-nothing).
// NO invoca al `LLMProvider` (§11 Tech Spec).
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import {
  BulkLimitExceededError,
  EventNotMutableError,
} from '../domain/errors/bulk-confirm.errors.js';
import type { AITaskBulkRepository } from '../ports/ai-task-bulk.repository.js';
import type { OwnedEventMutabilityReader } from '../ports/owned-event-mutability.reader.js';
import type { BulkItemErrorCode } from '../dto/confirm-bulk.dto.js';
import type {
  ConfirmAITasksBulkItemResult,
  ConfirmAITasksBulkResponseDto,
} from '../dto/confirm-bulk.dto.js';
import { mapOutcomeToResult } from './bulk-confirm-result.mapper.js';
import { BulkConfirmTelemetry } from './bulk-confirm-telemetry.js';

export const BULK_CONFIRM_MAX_IDS = 50;

export interface ConfirmAITasksBulkInput {
  actor: { id: string; role: string };
  eventId: string;
  taskIds: string[];
  correlationId?: string;
  /** Reloj inyectable para tests deterministas (defaults `Date.now`). */
  now?: () => Date;
}

export class ConfirmAITasksBulkUseCase {
  constructor(
    private readonly repository: AITaskBulkRepository,
    private readonly eventReader: OwnedEventMutabilityReader,
    private readonly telemetry: BulkConfirmTelemetry = new BulkConfirmTelemetry(),
  ) {}

  async execute(input: ConfirmAITasksBulkInput): Promise<ConfirmAITasksBulkResponseDto> {
    const now = input.now ?? ((): Date => new Date());
    const startedAt = now().getTime();

    // 1) Dedup silencioso (AC-03 / EC-01). El orden de aparición se preserva.
    const uniqueIds = Array.from(new Set(input.taskIds));
    const requested = input.taskIds.length;
    const deduped = requested - uniqueIds.length;

    this.telemetry.requested({
      correlationId: input.correlationId,
      eventId: input.eventId,
      actorId: input.actor.id,
      requestedCount: requested,
      dedupedCount: uniqueIds.length,
    });

    // 2) Defensa adicional del límite tras dedup (EC-07). Zod acota hasta 200 pre-dedup;
    // el negocio impone 50 post-dedup.
    if (uniqueIds.length === 0) {
      // Este caso es normalmente atrapado por Zod (VR-03: min(1)); se defiende por si el
      // caller invoca el use case en un flujo interno sin schema.
      this.telemetry.rejected({
        correlationId: input.correlationId,
        eventId: input.eventId,
        actorId: input.actor.id,
        reason: 'validation',
      });
      throw new BulkLimitExceededError(0, BULK_CONFIRM_MAX_IDS);
    }
    if (uniqueIds.length > BULK_CONFIRM_MAX_IDS) {
      this.telemetry.rejected({
        correlationId: input.correlationId,
        eventId: input.eventId,
        actorId: input.actor.id,
        reason: 'bulk_limit_exceeded',
      });
      throw new BulkLimitExceededError(uniqueIds.length, BULK_CONFIRM_MAX_IDS);
    }

    // 3) Ownership + existencia del evento. El reader retorna `null` si no existe o no pertenece
    // al actor → `404 NOT_FOUND` global sin filtrar existencia (SEC-04 / EC-02).
    const owned = await this.eventReader.find(input.eventId, input.actor.id);
    if (!owned) {
      this.telemetry.rejected({
        correlationId: input.correlationId,
        eventId: input.eventId,
        actorId: input.actor.id,
        reason: 'not_owner',
      });
      throw new NotFoundError('Event not found');
    }

    // 4) Mutabilidad del evento (EC-09). Sin `mutable=false` no se procesa ningún ítem.
    if (!owned.mutable) {
      this.telemetry.conflict({
        correlationId: input.correlationId,
        eventId: owned.id,
        eventStatus: owned.immutableReason ?? owned.status,
      });
      throw new EventNotMutableError(owned.immutableReason ?? owned.status);
    }

    // 5) Loop secuencial por ítem — micro-transacción atómica por fila (AC-01/02/04/05/EC-10).
    const results: ConfirmAITasksBulkItemResult[] = [];
    let acceptedCount = 0;
    const errorCodesSummary: Partial<Record<BulkItemErrorCode, number>> = {};
    const confirmedAt = now();
    for (const taskId of uniqueIds) {
      const outcome = await this.repository.confirmConditional({
        taskId,
        eventId: owned.id,
        actorId: input.actor.id,
        correlationId: input.correlationId,
        confirmedAt,
      });
      const mapped = mapOutcomeToResult(taskId, outcome);
      results.push(mapped);
      if (mapped.accepted) {
        acceptedCount += 1;
      } else if (mapped.error) {
        errorCodesSummary[mapped.error.code] = (errorCodesSummary[mapped.error.code] ?? 0) + 1;
      }
    }

    const rejectedCount = uniqueIds.length - acceptedCount;
    const latencyMs = now().getTime() - startedAt;

    if (rejectedCount === 0) {
      this.telemetry.succeeded({
        correlationId: input.correlationId,
        eventId: owned.id,
        actorId: input.actor.id,
        requestedCount: requested,
        dedupedCount: uniqueIds.length,
        acceptedCount,
        latencyMs,
      });
    } else {
      this.telemetry.partialFailed({
        correlationId: input.correlationId,
        eventId: owned.id,
        actorId: input.actor.id,
        requestedCount: requested,
        dedupedCount: uniqueIds.length,
        acceptedCount,
        rejectedCount,
        latencyMs,
        errorCodesSummary,
      });
    }

    return {
      results,
      summary: {
        requested,
        deduped,
        accepted: acceptedCount,
        rejected: rejectedCount,
      },
    };
  }
}
