// US-028 (PB-P1-018 / BE-005) — Caso de uso orquestador de la creación manual de EventTask.
// Flujo: ownership+lock (dentro de tx) → verificar mutabilidad → lookup categoría (si aplica) →
// insert → mapear a `TaskListItemDto` → emitir log. Ver Tech Spec §7 UseCases + §17 Risks.
//
// Contrato de errores (mapeados por el error handler central):
//   * Evento ajeno/inexistente/soft-deleted → NotFoundError → 404 (SEC-04 no-revelación).
//   * event.status ∈ {cancelled, completed} → EventNotMutableError → 409 (EC-07).
//   * category_code inválido/inactivo → CategoryNotAvailableError → 400 (EC-06).
//
// SIN invocación al LLMProvider (BR-AI-008). `ai_generated=false`/`ai_recommendation_id=null`
// los fija el repositorio, no el use case.
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error.js';
import { EventNotMutableError } from '../../bulk-confirm/domain/errors/bulk-confirm.errors.js';
import { CategoryNotAvailableError } from '../domain/errors/create-event-task.errors.js';
import { toTaskListItemDto } from '../../list/infrastructure/mappers/task-list-item.mapper.js';
import type { TaskListItemDto } from '../../list/application/dtos/task-list-item.dto.js';
import type { EventTaskCreateRepository } from '../ports/event-task-create.repository.js';
import type { OwnedEventForCreateReader } from '../ports/owned-event-for-create.reader.js';
import type { ServiceCategoryReadPort } from '../ports/service-category-read.port.js';
import { CreateEventTaskTelemetry } from './create-event-task-telemetry.js';

export interface CreateEventTaskInputCmd {
  actorId: string;
  eventId: string;
  body: {
    title: string;
    description: string | null;
    due_date: string | null;
    category_code: string | null;
  };
  ignoredFields: string[];
  correlationId: string;
}

export class CreateEventTaskUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventReader: OwnedEventForCreateReader,
    private readonly categoryReader: ServiceCategoryReadPort,
    private readonly repository: EventTaskCreateRepository,
    private readonly telemetry: CreateEventTaskTelemetry = new CreateEventTaskTelemetry(),
  ) {}

  async execute(cmd: CreateEventTaskInputCmd): Promise<TaskListItemDto> {
    const startedAt = Date.now();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const owned = await this.eventReader.findOwnedForUpdate(
          tx,
          cmd.eventId,
          cmd.actorId,
        );
        if (owned === null || owned.deletedAt !== null) {
          // SEC-04 no-revelación: ajeno/inexistente/soft-deleted colapsan a 404.
          throw new NotFoundError('Resource not found');
        }
        if (owned.status === 'cancelled' || owned.status === 'completed') {
          throw new EventNotMutableError(owned.status);
        }

        if (cmd.body.category_code !== null) {
          const category = await this.categoryReader.findActiveByCode(
            cmd.body.category_code,
            tx,
          );
          if (category === null) {
            throw new CategoryNotAvailableError(cmd.body.category_code);
          }
        }

        const row = await this.repository.create(
          {
            eventId: cmd.eventId,
            title: cmd.body.title,
            description: cmd.body.description,
            dueDate: cmd.body.due_date,
            categoryCode: cmd.body.category_code,
            languageCode: owned.language,
            createdByUserId: cmd.actorId,
          },
          tx,
        );
        return { row, languageCode: owned.language };
      });

      const dto = toTaskListItemDto(result.row);
      this.telemetry.emitCreated({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        taskId: dto.id,
        aiGenerated: false,
        hasDueDate: dto.due_date !== null,
        hasCategory: dto.category_code !== null,
        languageCode: result.languageCode,
        latencyMs: Date.now() - startedAt,
        statusCode: 201,
        ignoredFields: cmd.ignoredFields.length > 0 ? cmd.ignoredFields : undefined,
      });
      return dto;
    } catch (err) {
      // La telemetría de fallo se emite aquí; el error handler central sigue mapeando a HTTP.
      const httpStatus = errToHttp(err);
      const errorCode = errToCode(err);
      this.telemetry.emitFailed({
        correlationId: cmd.correlationId,
        actorId: cmd.actorId,
        eventId: cmd.eventId,
        errorCode,
        httpStatus,
        latencyMs: Date.now() - startedAt,
        ignoredFields: cmd.ignoredFields.length > 0 ? cmd.ignoredFields : undefined,
      });
      throw err;
    }
  }
}

function errToHttp(err: unknown): number {
  if (err instanceof NotFoundError) return 404;
  if (err instanceof EventNotMutableError) return 409;
  if (err instanceof CategoryNotAvailableError) return 400;
  return 500;
}

function errToCode(err: unknown): string {
  if (err instanceof NotFoundError) return 'RESOURCE_NOT_FOUND';
  if (err instanceof EventNotMutableError) return 'EVENT_NOT_MUTABLE';
  if (err instanceof CategoryNotAvailableError) return 'CATEGORY_NOT_AVAILABLE';
  return 'INTERNAL_ERROR';
}
