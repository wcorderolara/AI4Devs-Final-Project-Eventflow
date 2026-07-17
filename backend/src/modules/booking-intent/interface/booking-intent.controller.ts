// Controlador de booking-intent — delegación a use cases (US-096 lectura/confirm/cancel;
// US-060 creación atómica). Se mantiene delgado y sin lógica de negocio.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toBookingIntentResponse } from '../dto/index.js';
import type {
  CancelBookingIntentRequest,
  BookingIntentIdParam,
} from '../dto/index.js';
import type { CreateBookingIntentUs060Body } from '../dto/create-booking-intent.request.js';
import type {
  GetBookingIntentUseCase,
  ConfirmBookingIntentUseCase,
  CancelBookingIntentUseCase,
} from '../application/booking-intent.use-cases.js';
import type { CreateBookingIntentUs060UseCase } from '../application/create-booking-intent.us060.use-case.js';

function actor(req: Request): { id: string; role: string } {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return { id: u.id, role: u.role };
}

export interface BookingIntentUseCases {
  create: CreateBookingIntentUs060UseCase;
  get: GetBookingIntentUseCase;
  confirm: ConfirmBookingIntentUseCase;
  cancel: CancelBookingIntentUseCase;
}

export class BookingIntentsController {
  constructor(private readonly uc: BookingIntentUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateBookingIntentUs060Body;
    const view = await this.uc.create.execute(actor(req).id, body, { correlationId: req.correlationId });
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
