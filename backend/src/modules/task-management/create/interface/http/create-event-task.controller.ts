// US-028 (PB-P1-018 / API-001) — Controller delgado del endpoint de creación manual.
// Composición: `auth → role → handler` en `create-event-task.routes.ts`. Este controller:
//  1. Valida Content-Type = application/json (EC-12 → 415 UNSUPPORTED_MEDIA_TYPE).
//  2. Valida path con `createEventTaskParamsSchema` (VR-01 / NT-01 → 400 VALIDATION_ERROR).
//  3. Calcula `ignoredFields` sobre el body crudo ANTES del `.strip()` (AC-03, EC-11).
//  4. Valida body con `createEventTaskBodySchema` (VR-04..08 → 400 VALIDATION_ERROR).
//  5. Delega al `CreateEventTaskUseCase`.
//  6. Devuelve `201 Created` con header `Location` y `TaskListItemDto` en el envelope canónico.
import type { Request, Response } from 'express';
import { z } from 'zod';
import { success } from '../../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../../shared/domain/errors/unauthorized.error.js';
import { ValidationError } from '../../../../../shared/domain/errors/validation.error.js';
import { UnsupportedMediaTypeError } from '../../domain/errors/create-event-task.errors.js';
import type { CreateEventTaskUseCase } from '../../application/create-event-task.use-case.js';
import {
  createEventTaskBodySchema,
  createEventTaskParamsSchema,
  extractIgnoredFields,
} from './create-event-task.schema.js';

const API_V1_PREFIX = '/api/v1';

export class CreateEventTaskController {
  constructor(private readonly useCase: CreateEventTaskUseCase) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    // Content-Type — EC-12. Aceptamos `application/json` con o sin parámetros
    // (`; charset=utf-8`). Métodos y body vienen ya parseados si el JSON era válido.
    const contentType = req.header('content-type');
    if (!contentType || !contentType.split(';')[0]?.trim().toLowerCase().startsWith('application/json')) {
      throw new UnsupportedMediaTypeError();
    }

    // Path — VR-01.
    const params = safeParseOrThrow(createEventTaskParamsSchema.safeParse(req.params));

    // `body.ignoredFields` — sobre el body crudo, ANTES del `.strip()` (AC-03, EC-11).
    const ignoredFields = extractIgnoredFields(req.body);

    // Body — VR-04..08. Si due_date es EC-04 (pasado), Zod produce message='DUE_DATE_IN_PAST' y
    // el error handler lo mantiene como `400 VALIDATION_ERROR` con `details.field='due_date'`
    // + `details.message='DUE_DATE_IN_PAST'` — el cliente distingue por el `message` literal.
    const body = safeParseOrThrow(createEventTaskBodySchema.safeParse(req.body ?? {}));

    const dto = await this.useCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      body,
      ignoredFields,
      correlationId: req.correlationId ?? '',
    });

    res.setHeader('Location', `${API_V1_PREFIX}/events/${params.eventId}/tasks/${dto.id}`);
    res.status(201).json(success(dto, req.correlationId ?? ''));
  };
}

/** Convierte un `safeParse` fallido en `ValidationError` con el shape canónico. */
function safeParseOrThrow<T>(
  parsed: z.SafeParseReturnType<unknown, T>,
): T {
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return parsed.data;
}
