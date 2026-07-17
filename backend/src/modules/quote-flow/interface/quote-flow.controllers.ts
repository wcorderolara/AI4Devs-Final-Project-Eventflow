// Controladores de quote-flow (US-096 / BE-004/005). Delgados: leen params/body/query validados,
// resuelven actor desde `req.user`, delegan a use cases y serializan el envelope estándar.
import type { Request, Response } from 'express';
import { success, type PaginationMeta } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toQuoteRequestResponse, toQuoteResponse } from '../dto/index.js';
import type {
  CreateQuoteRequestRequest,
  CreateQuoteRequestBody,
  UpdateQuoteRequestBody,
  ListQuoteRequestsQuery,
  EventIdParam,
  QuoteRequestIdParam,
  QuoteIdParam,
} from '../dto/index.js';
import type {
  CreateQuoteRequestUseCase,
  ListEventQuoteRequestsUseCase,
  ListVendorQuoteRequestsUseCase,
  GetQuoteRequestUseCase,
  MarkQuoteRequestViewedUseCase,
  ListResult,
} from '../application/quote-request.use-cases.js';
// US-056 (PB-P1-034 / BE-005): cancelación transaccional con notifications + check
// `confirmed_intent` (reemplaza el `CancelQuoteRequestUseCase` original de US-096 en el wiring
// — ver DEV-02 del execution record).
import type { CancelQuoteRequestUs056UseCase } from '../application/cancel-quote-request.us056.use-case.js';
import type { CancelQuoteRequestBody } from '../dto/cancel-quote-request.us056.request.js';
// US-057 (PB-P1-035 / BE-005): comparador de Quotes por categoría.
import type { CompareQuotesUseCase } from '../application/compare-quotes.us057.use-case.js';
import type {
  CompareQuotesEventIdParam,
  CompareQuotesQuery,
} from '../dto/compare-quotes.us057.query.js';
import type {
  CreateQuoteUseCase,
  GetQuoteForQuoteRequestUseCase,
  UpdateQuoteUseCase,
  SendQuoteUseCase,
  AcceptQuoteUseCase,
} from '../application/quote.use-cases.js';
// US-054 (PB-P1-032 / BE-005): reject transaccional con body opcional (reemplaza el use case
// original de US-096 en el wiring — ver DEV-02 del execution record).
import type { RejectQuoteUs054UseCase } from '../application/reject-quote.us054.use-case.js';
import type { RejectQuoteBody } from '../dto/reject-quote.us054.request.js';
// US-058 (PB-P1-035 / BE-003/004): toggle preferred transaccional con notifs bilaterales
// (reemplaza el `PreferQuoteUseCase` original de US-096 en el wiring — DEV-01 del execution
// record). El endpoint canónico es `PATCH /quotes/:quoteId/preferred`; el legacy POST `/prefer`
// se preserva delegando al mismo UC con `{is_preferred: true}`.
import type { PreferQuoteUs058UseCase } from '../application/prefer-quote.us058.use-case.js';
import type { PreferQuoteBody } from '../dto/prefer-quote.us058.request.js';

interface Actor {
  id: string;
  role: string;
}
function actor(req: Request): Actor {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return { id: u.id, role: u.role };
}
function paginationOf(r: ListResult): PaginationMeta {
  return { page: r.page, pageSize: r.pageSize, total: r.total, totalPages: Math.ceil(r.total / r.pageSize) };
}

export interface QuoteRequestUseCases {
  create: CreateQuoteRequestUseCase;
  listByEvent: ListEventQuoteRequestsUseCase;
  listByVendor: ListVendorQuoteRequestsUseCase;
  get: GetQuoteRequestUseCase;
  cancel: CancelQuoteRequestUs056UseCase;
  markViewed: MarkQuoteRequestViewedUseCase;
  compareQuotes: CompareQuotesUseCase;
}

export class QuoteRequestsController {
  constructor(private readonly uc: QuoteRequestUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const body = req.validated?.body as CreateQuoteRequestRequest;
    const view = await this.uc.create.execute(actor(req).id, eventId, body, { correlationId: req.correlationId });
    res.status(201).json(success(toQuoteRequestResponse(view), req.correlationId ?? ''));
  };

  listByEvent = async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.validated?.params as EventIdParam;
    const query = req.validated?.query as ListQuoteRequestsQuery;
    const result = await this.uc.listByEvent.execute(actor(req).id, eventId, query);
    res.status(200).json(success(result.items.map(toQuoteRequestResponse), req.correlationId ?? '', paginationOf(result)));
  };

  listByVendor = async (req: Request, res: Response): Promise<void> => {
    const query = req.validated?.query as ListQuoteRequestsQuery;
    const result = await this.uc.listByVendor.execute(actor(req).id, query);
    res.status(200).json(success(result.items.map(toQuoteRequestResponse), req.correlationId ?? '', paginationOf(result)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const { quoteRequestId } = req.validated?.params as QuoteRequestIdParam;
    const a = actor(req);
    const view = await this.uc.get.execute(a.id, a.role, quoteRequestId);
    res.status(200).json(success(toQuoteRequestResponse(view), req.correlationId ?? ''));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { quoteRequestId } = req.validated?.params as QuoteRequestIdParam;
    // US-056 (BE-005): body opcional `{ reason?: string [0..500] }`. Ausente en calls
    // legacy (pre-US-056) — se normaliza a `{}` para preservar compatibilidad.
    const body = (req.validated?.body ?? {}) as CancelQuoteRequestBody;
    const view = await this.uc.cancel.execute(actor(req).id, quoteRequestId, body, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toQuoteRequestResponse(view), req.correlationId ?? ''));
  };

  markViewed = async (req: Request, res: Response): Promise<void> => {
    const { quoteRequestId } = req.validated?.params as QuoteRequestIdParam;
    await this.uc.markViewed.execute(actor(req).id, quoteRequestId, { correlationId: req.correlationId });
    res.status(204).end();
  };

  // US-057 (PB-P1-035 / BE-005): endpoint sólo-lectura del comparador de Quotes.
  // El param canonical es `:id` (no `:eventId`) según §7 del Tech Spec.
  compareQuotes = async (req: Request, res: Response): Promise<void> => {
    const { id: eventId } = req.validated?.params as CompareQuotesEventIdParam;
    const query = (req.validated?.query ?? {}) as CompareQuotesQuery;
    const view = await this.uc.compareQuotes.execute(actor(req).id, eventId, query, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(view, req.correlationId ?? ''));
  };
}

export interface QuoteUseCases {
  create: CreateQuoteUseCase;
  getForRequest: GetQuoteForQuoteRequestUseCase;
  update: UpdateQuoteUseCase;
  send: SendQuoteUseCase;
  accept: AcceptQuoteUseCase;
  reject: RejectQuoteUs054UseCase;
  // US-058 (BE-004): el UC transaccional cubre ambas rutas — el legacy POST /prefer se resuelve
  // como `{is_preferred: true}` (DEV-01), el nuevo PATCH /preferred recibe el body real.
  prefer: PreferQuoteUs058UseCase;
}

export class QuotesController {
  constructor(private readonly uc: QuoteUseCases) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const { quoteRequestId } = req.validated?.params as QuoteRequestIdParam;
    const body = req.validated?.body as CreateQuoteRequestBody;
    const view = await this.uc.create.execute(actor(req).id, quoteRequestId, body, { correlationId: req.correlationId });
    res.status(201).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  getForRequest = async (req: Request, res: Response): Promise<void> => {
    const { quoteRequestId } = req.validated?.params as QuoteRequestIdParam;
    const a = actor(req);
    const view = await this.uc.getForRequest.execute(a.id, a.role, quoteRequestId);
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const body = req.validated?.body as UpdateQuoteRequestBody;
    const view = await this.uc.update.execute(actor(req).id, quoteId, body, { correlationId: req.correlationId });
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const view = await this.uc.send.execute(actor(req).id, quoteId, { correlationId: req.correlationId });
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const view = await this.uc.accept.execute(actor(req).id, quoteId, { correlationId: req.correlationId });
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const body = (req.validated?.body ?? {}) as RejectQuoteBody;
    const view = await this.uc.reject.execute(actor(req).id, quoteId, body, { correlationId: req.correlationId });
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  // US-058 (BE-004): legacy POST /quotes/:quoteId/prefer. Preservamos el contrato existente
  // (sin body) delegando al mismo UC transaccional con `{is_preferred: true}` — DEV-01.
  prefer = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const view = await this.uc.prefer.execute(
      actor(req).id,
      quoteId,
      { is_preferred: true },
      { correlationId: req.correlationId },
    );
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };

  // US-058 (BE-004): endpoint canónico `PATCH /quotes/:quoteId/preferred`. Body
  // `{is_preferred: boolean}` valida idempotencia (AC-04), unmark (AC-03), y cambio de
  // preferida (AC-02). Delega en `PreferQuoteUs058UseCase`.
  preferred = async (req: Request, res: Response): Promise<void> => {
    const { quoteId } = req.validated?.params as QuoteIdParam;
    const body = req.validated?.body as PreferQuoteBody;
    const view = await this.uc.prefer.execute(actor(req).id, quoteId, body, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toQuoteResponse(view), req.correlationId ?? ''));
  };
}
