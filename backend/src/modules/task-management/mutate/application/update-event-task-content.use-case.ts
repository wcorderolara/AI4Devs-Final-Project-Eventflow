// US-029 (PB-P1-018 / BE-004) — Caso de uso PATCH content de EventTask (Tech Spec §7).
// Flujo:
//   1. `$transaction` con `pg_advisory_xact_lock(hashtextextended(eventId, 0))`.
//   2. `findEventForMutation` → ownership + mutabilidad (`404` masked, `409 EVENT_NOT_MUTABLE`).
//   3. `findTaskOwnedByEvent` (soft-deleted → 404).
//   4. Validación `due_date` futura solo cuando `currentStatus === 'pending'` (VR-08, EC-08/09).
//   5. Validación `category_code` cuando se envía y no es `null` vía `ServiceCategoryReadPort`.
//   6. UPDATE proyectando solo campos editables (BR-AI-008/010 preservados).
//   7. Map a `TaskListItemDto`.
//   8. Telemetría `tasks.updated` con `fields_changed[]`.
// NUNCA modifica `ai_generated`, `ai_recommendation_id`, `confirmed_at`, `language_code`,
// `created_by_user_id`, `status`, `origin`.
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import { EventNotMutableError } from '../../bulk-confirm/domain/errors/bulk-confirm.errors.js';
import {
  CategoryNotAvailableError,
  DueDateInPastError,
} from '../../create/domain/errors/create-event-task.errors.js';
import { toTaskListItemDto } from '../../list/infrastructure/mappers/task-list-item.mapper.js';
import type { TaskListItemDto } from '../../list/application/dtos/task-list-item.dto.js';
import type { EventTaskMutateRepository } from '../ports/event-task-mutate.repository.js';
import type { ServiceCategoryReadPort } from '../../create/ports/service-category-read.port.js';
import type { CanonicalEventTaskStatus } from '../domain/EventTaskStateMachineService.js';
import { MutateEventTaskTelemetry } from './mutate-event-task.telemetry.js';

const DUE_DATE_PAST_TOLERANCE_MS = 60_000;

export interface UpdateEventTaskContentInputCmd {
  actorId: string;
  eventId: string;
  taskId: string;
  body: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    category_code?: string | null;
  };
  ignoredFields: string[];
  correlationId: string;
}

export class UpdateEventTaskContentUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repository: EventTaskMutateRepository,
    private readonly categoryReader: ServiceCategoryReadPort,
    private readonly telemetry: MutateEventTaskTelemetry = new MutateEventTaskTelemetry(),
  ) {}

  async execute(cmd: UpdateEventTaskContentInputCmd): Promise<TaskListItemDto> {
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

        // due_date en el pasado: rechazado SOLO cuando la tarea está pending (EC-08/09).
        if (
          cmd.body.due_date !== undefined &&
          cmd.body.due_date !== null &&
          task.status === 'pending'
        ) {
          const t = Date.parse(cmd.body.due_date);
          if (Number.isNaN(t) || t < Date.now() - DUE_DATE_PAST_TOLERANCE_MS) {
            throw new DueDateInPastError();
          }
        }

        // category_code: validado solo si se envía (no undefined) y no es null.
        if (cmd.body.category_code !== undefined && cmd.body.category_code !== null) {
          const cat = await this.categoryReader.findActiveByCode(cmd.body.category_code, tx);
          if (cat === null) {
            throw new CategoryNotAvailableError(cmd.body.category_code);
          }
        }

        const updated = await this.repository.updateContent(
          tx,
          cmd.eventId,
          cmd.taskId,
          {
            title: cmd.body.title,
            description: cmd.body.description,
            dueDate:
              cmd.body.due_date === undefined
                ? undefined
                : cmd.body.due_date === null
                  ? null
                  : new Date(cmd.body.due_date),
            categoryCode: cmd.body.category_code,
          },
          cmd.actorId,
          cmd.correlationId,
        );

        return { updated, aiGenerated: task.aiGenerated };
      });

      const dto = toTaskListItemDto(result.updated);
      const fieldsChanged = Object.keys(cmd.body).filter(
        (k) => cmd.body[k as keyof typeof cmd.body] !== undefined,
      );
      this.telemetry.emitUpdated({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: cmd.taskId,
        aiGenerated: result.aiGenerated,
        operation: 'content',
        fieldsChanged,
        latencyMs: Date.now() - startedAt,
        ignoredFields: cmd.ignoredFields.length > 0 ? cmd.ignoredFields : undefined,
      });
      return dto;
    } catch (err) {
      this.emitRejection(cmd, err, Date.now() - startedAt);
      throw err;
    }
  }

  private emitRejection(
    cmd: UpdateEventTaskContentInputCmd,
    err: unknown,
    latencyMs: number,
  ): void {
    const status = err instanceof NotFoundError ? 404
      : err instanceof EventNotMutableError ? 409
      : err instanceof CategoryNotAvailableError ? 400
      : err instanceof DueDateInPastError ? 400
      : 500;
    const code = err instanceof NotFoundError ? 'RESOURCE_NOT_FOUND'
      : err instanceof EventNotMutableError ? 'EVENT_NOT_MUTABLE'
      : err instanceof CategoryNotAvailableError ? 'CATEGORY_NOT_AVAILABLE'
      : err instanceof DueDateInPastError ? 'DUE_DATE_IN_PAST'
      : 'INTERNAL_ERROR';
    if (err instanceof EventNotMutableError) {
      this.telemetry.emitBlocked({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: cmd.taskId,
        operation: 'content',
        eventStatus: err.eventStatus,
        latencyMs,
      });
      return;
    }
    this.telemetry.emitRejected({
      correlationId: cmd.correlationId,
      actorId: cmd.actorId,
      eventId: cmd.eventId,
      taskId: cmd.taskId,
      operation: 'content',
      reason: status === 404 ? 'not_found' : status === 400 ? 'validation' : 'other',
      httpStatus: status,
      errorCode: code,
      latencyMs,
      ignoredFields: cmd.ignoredFields.length > 0 ? cmd.ignoredFields : undefined,
    });
  }
}

// Suprimimos avisos TS por el helper genérico que sí acepta la key discriminada.
void ({} as CanonicalEventTaskStatus);
