// US-029 (PB-P1-018 / API-001, API-002, API-003) — Controller delgado para las 3 mutaciones.
// Composición canónica en `mutate-event-task.routes.ts`: `auth → role → handler`. Este controller:
//   1. Valida Content-Type = application/json en los PATCH (EC-14 → 415).
//   2. Valida path con `taskMutationParamsSchema` (VR-01/02).
//   3. Calcula `body.ignoredFields` ANTES del `.strip()` (EC-07, VR-12).
//   4. Valida body con el schema correspondiente.
//   5. Delega al use case.
//   6. Devuelve `200` + envelope `success(dto)` o `204` sin body para DELETE.
import type { Request, Response } from 'express';
import { z } from 'zod';
import { success } from '../../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../../shared/domain/errors/unauthorized.error.js';
import { ValidationError } from '../../../../../shared/domain/errors/validation.error.js';
import { UnsupportedMediaTypeError } from '../../../create/domain/errors/create-event-task.errors.js';
import { EmptyPatchError } from '../../domain/errors/mutate-event-task.errors.js';
import type { UpdateEventTaskContentUseCase } from '../../application/update-event-task-content.use-case.js';
import type { UpdateEventTaskStatusUseCase } from '../../application/update-event-task-status.use-case.js';
import type { SoftDeleteEventTaskUseCase } from '../../application/soft-delete-event-task.use-case.js';
import {
  ALLOWED_CONTENT_KEYS,
  extractIgnoredFields,
  taskMutationParamsSchema,
  updateEventTaskContentBodySchema,
  updateEventTaskStatusBodySchema,
} from './mutate-event-task.schema.js';

function safeParseOrThrow<T>(parsed: z.SafeParseReturnType<unknown, T>): T {
  if (!parsed.success) {
    // EMPTY_PATCH producido por la `superRefine` — se distingue por el `message` literal.
    const emptyIssue = parsed.error.issues.find((i) => i.message === 'EMPTY_PATCH');
    if (emptyIssue) throw new EmptyPatchError();
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return parsed.data;
}

function requireJsonContentType(req: Request): void {
  const ct = req.header('content-type');
  if (!ct || !ct.split(';')[0]?.trim().toLowerCase().startsWith('application/json')) {
    throw new UnsupportedMediaTypeError();
  }
}

export class MutateEventTaskController {
  constructor(
    private readonly updateContent: UpdateEventTaskContentUseCase,
    private readonly updateStatus: UpdateEventTaskStatusUseCase,
    private readonly softDelete: SoftDeleteEventTaskUseCase,
  ) {}

  patchContent = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    requireJsonContentType(req);
    const params = safeParseOrThrow(taskMutationParamsSchema.safeParse(req.params));
    const ignoredFields = extractIgnoredFields(req.body, ALLOWED_CONTENT_KEYS);
    const body = safeParseOrThrow(updateEventTaskContentBodySchema.safeParse(req.body ?? {}));

    const dto = await this.updateContent.execute({
      actorId: actor.id,
      eventId: params.eventId,
      taskId: params.taskId,
      body,
      ignoredFields,
      correlationId: req.correlationId ?? '',
    });
    res.status(200).json(success(dto, req.correlationId ?? ''));
  };

  patchStatus = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    requireJsonContentType(req);
    const params = safeParseOrThrow(taskMutationParamsSchema.safeParse(req.params));
    // status body: server-controlled keys y `status` es la única aceptada.
    const ignoredFields = extractIgnoredFields(req.body, ['status']);
    const body = safeParseOrThrow(updateEventTaskStatusBodySchema.safeParse(req.body ?? {}));

    const dto = await this.updateStatus.execute({
      actorId: actor.id,
      eventId: params.eventId,
      taskId: params.taskId,
      body,
      ignoredFields,
      correlationId: req.correlationId ?? '',
    });
    res.status(200).json(success(dto, req.correlationId ?? ''));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    // DELETE ignora cualquier body y no valida Content-Type (VR-13).
    const params = safeParseOrThrow(taskMutationParamsSchema.safeParse(req.params));

    await this.softDelete.execute({
      actorId: actor.id,
      eventId: params.eventId,
      taskId: params.taskId,
      correlationId: req.correlationId ?? '',
    });
    // 204 sin body ni Content-Type.
    res.status(204).end();
  };
}
