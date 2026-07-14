// US-029 (PB-P1-018 / BE-006) — Caso de uso DELETE soft de EventTask (Tech Spec §7).
// Flujo:
//   1. `$transaction` + lock cooperativo.
//   2. `findEventForMutation` → ownership + mutabilidad.
//   3. `softDeleteConditional` (`false` → 404, no-revelación).
//   4. Retornar void (controller responde 204 sin body).
//   5. Telemetría `tasks.deleted`.
// NUNCA hard delete; NUNCA restaura; NUNCA toca `AIRecommendation`.
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import { EventNotMutableError } from '../../bulk-confirm/domain/errors/bulk-confirm.errors.js';
import type { EventTaskMutateRepository } from '../ports/event-task-mutate.repository.js';
import { MutateEventTaskTelemetry } from './mutate-event-task.telemetry.js';

export interface SoftDeleteEventTaskInputCmd {
  actorId: string;
  eventId: string;
  taskId: string;
  correlationId: string;
}

export class SoftDeleteEventTaskUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: EventTaskMutateRepository,
    private readonly telemetry: MutateEventTaskTelemetry = new MutateEventTaskTelemetry(),
  ) {}

  async execute(cmd: SoftDeleteEventTaskInputCmd): Promise<void> {
    const startedAt = Date.now();
    try {
      const aiGenerated = await this.prisma.$transaction(async (tx) => {
        await this.repository.acquireEventLock(tx, cmd.eventId);

        const event = await this.repository.findEventForMutation(tx, cmd.eventId);
        if (event === null || event.deletedAt !== null || event.ownerUserId !== cmd.actorId) {
          throw new NotFoundError('Resource not found');
        }
        if (event.status === 'cancelled' || event.status === 'completed') {
          throw new EventNotMutableError(event.status);
        }

        // Lookup previo para saber `aiGenerated` (para el log). Retorna null si soft-deleted
        // o no pertenece → 404 (no-revelación cubre "ya eliminada" y "no existía").
        const task = await this.repository.findTaskOwnedByEvent(tx, cmd.eventId, cmd.taskId);
        if (task === null) {
          throw new NotFoundError('Resource not found');
        }

        const deleted = await this.repository.softDeleteConditional(
          tx,
          cmd.eventId,
          cmd.taskId,
          cmd.actorId,
          cmd.correlationId,
        );
        if (!deleted) {
          throw new NotFoundError('Resource not found');
        }
        return task.aiGenerated;
      });

      this.telemetry.emitDeleted({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: cmd.taskId,
        aiGenerated,
        latencyMs: Date.now() - startedAt,
      });
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      if (err instanceof EventNotMutableError) {
        this.telemetry.emitBlocked({
          correlationId: cmd.correlationId,
          actorId: cmd.actorId,
          eventId: cmd.eventId,
          taskId: cmd.taskId,
          operation: 'delete',
          eventStatus: err.eventStatus,
          latencyMs,
        });
      } else {
        const status = err instanceof NotFoundError ? 404 : 500;
        const code = err instanceof NotFoundError ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR';
        this.telemetry.emitRejected({
          correlationId: cmd.correlationId,
          actorId: cmd.actorId,
          eventId: cmd.eventId,
          taskId: cmd.taskId,
          operation: 'delete',
          reason: status === 404 ? 'not_found' : 'other',
          httpStatus: status,
          errorCode: code,
          latencyMs,
        });
      }
      throw err;
    }
  }
}
