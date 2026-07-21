// US-080 / BE-003 — Controlador `GET /api/v1/admin/admin-actions`.
// Delgado: usa lo ya validado (`req.validated.query`), invoca el use case y serializa. Los
// errores propagan al `errorHandlerMiddleware` global (US-091).
//
// Contrato (Tech Spec §7 · AC-01/AC-02):
//   - `200 {items, pagination}` con envelope `success`.
//   - `400 INVALID_CURSOR` cuando el cursor no decodifica (EC-02).
//   - `400 VALIDATION_ERROR` para cualquier query param fuera de spec (EC-03, EC-04).
//   - `401` sin sesión; `403` rol distinto de admin (guards en la ruta).
//
// AC-04 / Decisión PO D6: este handler NO crea AdminAction (evita self-log loop). El log
// estructurado `admin.admin_actions.viewed` lo emite el use case.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { ListAdminActionsUseCase } from '../application/list-admin-actions.use-case.js';
import type { AdminActionsQuery } from './admin-actions-query.dto.js';

export interface AdminActionsControllerDeps {
  listAdminActions: ListAdminActionsUseCase;
}

function requireActorId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

export class AdminActionsController {
  constructor(private readonly deps: AdminActionsControllerDeps) {}

  list = async (req: Request, res: Response): Promise<void> => {
    requireActorId(req);
    const query = req.validated?.query as AdminActionsQuery;
    const result = await this.deps.listAdminActions.execute(query);
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
