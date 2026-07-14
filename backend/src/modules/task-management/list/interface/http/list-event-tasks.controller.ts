// US-027 (PB-P1-018 / API-001) — Controller delgado del listado paginado.
// Composición de la ruta (auth → role → validation → handler) vive en `list-event-tasks.routes.ts`.
// Este controller valida path con Zod (400 VALIDATION si UUID inválido), parsea query con el
// parser tolerante (EC-01: nunca 400 por filtros), y delega al use case.
import type { Request, Response } from 'express';
import { success, type PaginationMeta } from '../../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../../shared/domain/errors/unauthorized.error.js';
import type { ListEventTasksUseCase } from '../../application/list-event-tasks.use-case.js';
import { listEventTasksParamsSchema, parseListEventTasksQuery } from './list-event-tasks.schema.js';

export class ListEventTasksController {
  constructor(private readonly useCase: ListEventTasksUseCase) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();
    // Path validation (VR-01, NT-01): UUID inválido → ValidationError → 400.
    const params = listEventTasksParamsSchema.parse(req.params);
    // Query tolerante (EC-01, VR-03..07): descartes silenciosos + acumulación en filtersDropped.
    const { filters, pagination, filtersDropped } = parseListEventTasksQuery(req.query);

    const result = await this.useCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      filters,
      pagination,
      filtersDropped,
      correlationId: req.correlationId ?? '',
    });

    const paginationMeta: PaginationMeta = {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / result.pageSize),
    };

    // US-033 (PB-P1-019 / BE-004): el agregado `progress` se serializa como campo aditivo del
    // envelope canónico (sibling de `data`/`pagination`/`meta`) — D4 / AC-03. Siempre presente
    // en respuestas 200; nunca depende de `range`/`page`/`pageSize`.
    res
      .status(200)
      .json(success(result.items, req.correlationId ?? '', paginationMeta, result.progress));
  };
}
