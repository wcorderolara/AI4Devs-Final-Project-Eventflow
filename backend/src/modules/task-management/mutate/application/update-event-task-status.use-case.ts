// US-029 (PB-P1-018 / BE-005) — Caso de uso PATCH status de EventTask (Tech Spec §7).
// Flujo:
//   1. `$transaction` con lock cooperativo por event_id.
//   2. `findEventForMutation` → ownership + mutabilidad.
//   3. `findTaskOwnedByEvent` (soft-deleted → 404).
//   4. Si `current === requested` → no UPDATE; log `tasks.updated.no_op`; retornar DTO actual
//      (EC-03 idempotencia same-state → `200 no_op`).
//   5. `EventTaskStateMachineService.assertCanTransition` (puede lanzar
//      `InvalidTransitionError → 409 INVALID_TRANSITION`).
//   6. UPDATE condicional `WHERE id AND event_id AND status=$current AND deleted_at IS NULL`.
//      Si `affected=0` → diagnosticar 404 vs 409 con re-lookup.
//   7. Map a DTO.
//   8. Telemetría `tasks.updated` con `previousStatus`/`newStatus`.
// NUNCA modifica `confirmed_at` (delegado a US-025/US-031).
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import { EventNotMutableError } from '../../bulk-confirm/domain/errors/bulk-confirm.errors.js';
import { toTaskListItemDto } from '../../list/infrastructure/mappers/task-list-item.mapper.js';
import type { TaskListItemDto } from '../../list/application/dtos/task-list-item.dto.js';
import type { EventTaskMutateRepository } from '../ports/event-task-mutate.repository.js';
import {
  EventTaskStateMachineService,
  type CanonicalEventTaskStatus,
  InvalidTransitionError,
} from '../domain/EventTaskStateMachineService.js';
import { InvalidTransitionDomainError } from '../domain/errors/mutate-event-task.errors.js';
import { MutateEventTaskTelemetry } from './mutate-event-task.telemetry.js';

export interface UpdateEventTaskStatusInputCmd {
  actorId: string;
  eventId: string;
  taskId: string;
  body: { status: CanonicalEventTaskStatus };
  ignoredFields: string[];
  correlationId: string;
}

export class UpdateEventTaskStatusUseCase {
  private readonly stateMachine: EventTaskStateMachineService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: EventTaskMutateRepository,
    private readonly telemetry: MutateEventTaskTelemetry = new MutateEventTaskTelemetry(),
    stateMachine?: EventTaskStateMachineService,
  ) {
    this.stateMachine = stateMachine ?? new EventTaskStateMachineService();
  }

  async execute(cmd: UpdateEventTaskStatusInputCmd): Promise<TaskListItemDto> {
    const startedAt = Date.now();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await this.repository.acquireEventLock(tx, cmd.eventId);

        const event = await this.repository.findEventForMutation(tx, cmd.eventId);
        if (event === null || event.deletedAt !== null || event.ownerUserId !== cmd.actorId) {
          throw new NotFoundError('Resource not found');
        }
        if (event.status === 'cancelled' || event.status === 'completed') {
          throw new EventNotMutableError(event.status);
        }

        const task = await this.repository.findTaskOwnedByEvent(tx, cmd.eventId, cmd.taskId);
        if (task === null) {
          throw new NotFoundError('Resource not found');
        }

        const currentStatus = task.status as CanonicalEventTaskStatus;
        const requested = cmd.body.status;

        if (this.stateMachine.isSameState(currentStatus, requested)) {
          // no_op: no UPDATE; devolver DTO actual (respuesta canónica 200 sin avance de updated_at).
          return { noOp: true, current: currentStatus, task } as const;
        }

        try {
          this.stateMachine.assertCanTransition(currentStatus, requested);
        } catch (err) {
          if (err instanceof InvalidTransitionError) {
            throw new InvalidTransitionDomainError(err.current, err.requested, err.allowed);
          }
          throw err;
        }

        const updated = await this.repository.updateStatusConditional(
          tx,
          cmd.eventId,
          cmd.taskId,
          currentStatus,
          requested,
          cmd.actorId,
          cmd.correlationId,
        );
        if (updated === null) {
          // affected=0: raza entre lectura y UPDATE. Distinguir 404 vs 409 con re-lookup.
          const post = await this.repository.findTaskOwnedByEvent(tx, cmd.eventId, cmd.taskId);
          if (post === null) throw new NotFoundError('Resource not found');
          throw new InvalidTransitionDomainError(
            post.status as CanonicalEventTaskStatus,
            requested,
            this.stateMachine.allowedTransitionsFrom(post.status as CanonicalEventTaskStatus),
          );
        }
        return { noOp: false, current: currentStatus, requested, updated, aiGenerated: task.aiGenerated } as const;
      });

      const latency = Date.now() - startedAt;
      if (result.noOp) {
        this.telemetry.emitUpdatedNoOp({
          correlationId: cmd.correlationId,
          actorId: cmd.actorId,
          eventId: cmd.eventId,
          taskId: cmd.taskId,
          status: result.current,
          latencyMs: latency,
        });
        // Cast intermedio: `task` viene del lookup; adaptar shape a EventTaskRow via findUnique
        // no es necesario, pero devolvemos el DTO derivado del `task` con campos ya coherentes.
        const currentRow = await this.readRowAfterNoOp(cmd.taskId);
        return currentRow;
      }
      this.telemetry.emitUpdated({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: cmd.taskId,
        aiGenerated: result.aiGenerated,
        operation: 'status',
        fieldsChanged: ['status'],
        previousStatus: result.current,
        newStatus: result.requested,
        latencyMs: latency,
      });
      return toTaskListItemDto(result.updated);
    } catch (err) {
      this.emitRejection(cmd, err, Date.now() - startedAt);
      throw err;
    }
  }

  private async readRowAfterNoOp(taskId: string): Promise<TaskListItemDto> {
    // Lectura fresca fuera de la transacción (idempotente same-state).
    const row = await this.prisma.eventTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        categoryCode: true,
        aiGenerated: true,
        aiRecommendationId: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) throw new NotFoundError('Resource not found');
    return toTaskListItemDto({
      id: row.id,
      title: row.title,
      dueDate: row.dueDate,
      status: row.status,
      categoryCode: row.categoryCode,
      aiGenerated: row.aiGenerated,
      aiRecommendationId: row.aiRecommendationId,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private emitRejection(
    cmd: UpdateEventTaskStatusInputCmd,
    err: unknown,
    latencyMs: number,
  ): void {
    if (err instanceof EventNotMutableError) {
      this.telemetry.emitBlocked({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: cmd.taskId,
        operation: 'status',
        eventStatus: err.eventStatus,
        latencyMs,
      });
      return;
    }
    const status =
      err instanceof NotFoundError ? 404
      : err instanceof InvalidTransitionDomainError ? 409
      : 500;
    const code =
      err instanceof NotFoundError ? 'RESOURCE_NOT_FOUND'
      : err instanceof InvalidTransitionDomainError ? 'INVALID_TRANSITION'
      : 'INTERNAL_ERROR';
    this.telemetry.emitRejected({
      correlationId: cmd.correlationId,
      actorId: cmd.actorId,
      eventId: cmd.eventId,
      taskId: cmd.taskId,
      operation: 'status',
      reason: status === 404 ? 'not_found' : status === 409 ? 'invalid_transition' : 'other',
      httpStatus: status,
      errorCode: code,
      latencyMs,
    });
  }
}
