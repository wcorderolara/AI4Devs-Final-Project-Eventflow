// US-016 / BE-003 — Controlador admin de eventos.
// Contrato:
//   - `GET /api/v1/admin/events` (US-078 §7): 200 con `{items, pagination}` + envelope `success`.
//   - `GET /api/v1/admin/events/:id` (US-016 §7): 200 con `AdminEventReadView` (US-078 lo
//     extiende con `counts` + `budgetSummary`) + envelope `success`.
//   - `PATCH/DELETE/POST /api/v1/admin/events/:id`: 403 FORBIDDEN con `code='FORBIDDEN_WRITE'`
//     (baseline US-016 BE-005; ver deviation DEV-1 del execution record US-078).
// El controlador es DELGADO: usa lo ya validado (`req.validated.params/query`), invoca el use
// case y serializa. Los errores propagan al `errorHandlerMiddleware` global.
import type { Request, Response, RequestHandler } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { AdminViewEventUseCase } from '../application/admin-view-event.use-case.js';
import type { ListEventsForAdminUseCase } from '../application/list-events-for-admin.use-case.js';
import type { AdminEventIdParam } from '../dto/admin-event-id.param.js';
import type { AdminEventsQuery } from './admin-events-query.dto.js';
import type {
  AdminEventAuditLogger,
  AdminEventViewResult,
} from '../infrastructure/structured-admin-audit-logger.js';

export interface AdminEventsControllerDeps {
  viewEvent: AdminViewEventUseCase;
  listEvents: ListEventsForAdminUseCase;
  auditLogger: AdminEventAuditLogger;
}

function requireActorId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export class AdminEventsController {
  constructor(private readonly deps: AdminEventsControllerDeps) {}

  /** US-078 §7 — GET /api/v1/admin/events. Listado paginado con filtros combinados. */
  list = async (req: Request, res: Response): Promise<void> => {
    // AC-01 (US-078): NO se registra AdminAction en list (Decisión PO D2). El logger
    // estructurado de US-016 (`AdminEventAuditLogger.logView`) es específico del detail;
    // el list se loguea en el logger de request global (nivel http).
    const query = req.validated?.query as AdminEventsQuery;
    // El guard `requireActorId` valida que la sesión exista antes de listar.
    requireActorId(req);
    const result = await this.deps.listEvents.execute(query);
    res.status(200).json(success(result, req.correlationId ?? ''));
  };

  show = async (req: Request, res: Response): Promise<void> => {
    const started = Date.now();
    const { id } = req.validated?.params as AdminEventIdParam;
    const actorUserId = requireActorId(req);
    let result: AdminEventViewResult = 'ok';
    try {
      const view = await this.deps.viewEvent.execute({
        eventId: id,
        actorUserId,
        correlationId: req.correlationId ?? null,
      });
      res.status(200).json(success(view, req.correlationId ?? ''));
    } catch (err) {
      // OBS-001: clasificar el resultado para el log estructurado sin exponer el error real al cliente.
      result = classifyResult(err);
      throw err;
    } finally {
      this.deps.auditLogger.logView({
        actorUserId,
        targetEventId: id,
        correlationId: req.correlationId ?? null,
        latencyMs: Date.now() - started,
        result,
      });
    }
  };

  /** BE-005 / AC-02: bloqueo explícito de verbos de escritura admin. `403 FORBIDDEN_WRITE`. */
  rejectWrite: RequestHandler = (req, res) => {
    const correlationId = req.correlationId ?? '';
    res.status(403).json({
      error: {
        code: 'FORBIDDEN_WRITE',
        message: 'Admin write operations are not allowed on this resource.',
        correlationId,
      },
    });
  };
}

function classifyResult(err: unknown): AdminEventViewResult {
  if (err instanceof Error) {
    if (err.name === 'NotFoundError') return 'not_found';
    if (err.name === 'ForbiddenError' || err.name === 'AuthorizationError') return 'forbidden';
    if (err.name === 'ValidationError') return 'bad_request';
  }
  return 'error';
}
