// Controlador de event-planning (US-095 / BE-005). AC-01..AC-08. Controlador DELGADO: lee
// params/body/query ya validados, delega al use case y serializa el envelope estándar. Toda
// operación actúa sobre `req.user.id` (organizer de la sesión); nunca acepta ownerId del cliente.
import type { Request, Response } from 'express';
import { success, type PaginationMeta } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toEventResponse } from '../dto/index.js';
import type { CreateEventRequest, UpdateEventRequest, ListEventsQuery, EventIdParam } from '../dto/index.js';
import type { CreateEventUseCase } from '../application/create-event.use-case.js';
import type { ListMyEventsUseCase } from '../application/list-my-events.use-case.js';
import type { GetEventByIdUseCase } from '../application/get-event-by-id.use-case.js';
import type { UpdateEventUseCase } from '../application/update-event.use-case.js';
import type { ActivateEventUseCase } from '../application/activate-event.use-case.js';
import type { CancelEventUseCase } from '../application/cancel-event.use-case.js';
import type { SoftDeleteEventUseCase } from '../application/soft-delete-event.use-case.js';

export interface EventsUseCases {
  create: CreateEventUseCase;
  list: ListMyEventsUseCase;
  getById: GetEventByIdUseCase;
  update: UpdateEventUseCase;
  activate: ActivateEventUseCase;
  cancel: CancelEventUseCase;
  softDelete: SoftDeleteEventUseCase;
}

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export class EventsController {
  constructor(private readonly useCases: EventsUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateEventRequest;
    const view = await this.useCases.create.execute(requireUserId(req), body, {
      correlationId: req.correlationId,
    });
    res.status(201).json(success(toEventResponse(view), req.correlationId ?? ''));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = req.validated?.query as ListEventsQuery;
    const result = await this.useCases.list.execute(requireUserId(req), query);
    const pagination: PaginationMeta = {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize),
    };
    res
      .status(200)
      .json(success(result.items.map(toEventResponse), req.correlationId ?? '', pagination));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const view = await this.useCases.getById.execute(requireUserId(req), eventId);
    res.status(200).json(success(toEventResponse(view), req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const body = req.validated?.body as UpdateEventRequest;
    const view = await this.useCases.update.execute(requireUserId(req), eventId, body, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toEventResponse(view), req.correlationId ?? ''));
  };

  activate = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const view = await this.useCases.activate.execute(requireUserId(req), eventId, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toEventResponse(view), req.correlationId ?? ''));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const view = await this.useCases.cancel.execute(requireUserId(req), eventId, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toEventResponse(view), req.correlationId ?? ''));
  };

  // US-012: soft delete de borrador. 204 sin body en éxito.
  softDelete = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    await this.useCases.softDelete.execute(requireUserId(req), eventId, {
      correlationId: req.correlationId,
    });
    res.status(204).end();
  };
}
