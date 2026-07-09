// Controlador de booking-intent (US-096 / BE-007). Delgado; delega a use cases.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toBookingIntentResponse } from '../dto/index.js';
import type {
  CreateBookingIntentRequest,
  CancelBookingIntentRequest,
  BookingIntentIdParam,
} from '../dto/index.js';
import type {
  CreateBookingIntentUseCase,
  GetBookingIntentUseCase,
  ConfirmBookingIntentUseCase,
  CancelBookingIntentUseCase,
} from '../application/booking-intent.use-cases.js';

function actor(req: Request): { id: string; role: string } {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return { id: u.id, role: u.role };
}

export interface BookingIntentUseCases {
  create: CreateBookingIntentUseCase;
  get: GetBookingIntentUseCase;
  confirm: ConfirmBookingIntentUseCase;
  cancel: CancelBookingIntentUseCase;
}

export class BookingIntentsController {
  constructor(private readonly uc: BookingIntentUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateBookingIntentRequest;
    const view = await this.uc.create.execute(actor(req).id, body.quoteId, { correlationId: req.correlationId });
    res.status(201).json(success(toBookingIntentResponse(view), req.correlationId ?? ''));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { bookingIntentId } = req.validated?.params as BookingIntentIdParam;
    const a = actor(req);
    const view = await this.uc.get.execute(a.id, a.role, bookingIntentId);
    res.status(200).json(success(toBookingIntentResponse(view), req.correlationId ?? ''));
  };

  confirm = async (req: Request, res: Response): Promise<void> => {
    const { bookingIntentId } = req.validated?.params as BookingIntentIdParam;
    const view = await this.uc.confirm.execute(actor(req).id, bookingIntentId, { correlationId: req.correlationId });
    res.status(200).json(success(toBookingIntentResponse(view), req.correlationId ?? ''));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { bookingIntentId } = req.validated?.params as BookingIntentIdParam;
    const body = req.validated?.body as CancelBookingIntentRequest;
    const a = actor(req);
    const view = await this.uc.cancel.execute(a.id, a.role, bookingIntentId, body.cancellationReason, { correlationId: req.correlationId });
    res.status(200).json(success(toBookingIntentResponse(view), req.correlationId ?? ''));
  };
}
