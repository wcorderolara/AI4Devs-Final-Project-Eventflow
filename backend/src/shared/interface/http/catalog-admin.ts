// Controlador + router admin comunes de los catálogos (`ServiceCategory` US-075 y `EventType`
// US-076). Ambos exponen los mismos 4 endpoints con delegación fina a sus UseCases:
//
//   GET    /                 → listado (incluye `is_active=false`)
//   POST   /                 → crear (201)
//   PATCH  /:id              → update / reactivate
//   DELETE /:id              → soft delete con reason
//
// Orden canónico: sessionAuth → adminOnly → validateRequest → handler.
import { Router, type Request, type Response } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { success } from '../../response/index.js';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error.js';
import {
  InvalidReasonLengthError,
  ReasonRequiredError,
} from '../../domain/errors/catalog-admin.errors.js';
import type { CatalogAdminCtx } from '../../application/catalog-admin.js';
import { asyncHandler } from './async-handler.js';
import { validateRequestMiddleware } from '../middlewares/validate-request.middleware.js';
import { requireSession, requireRole } from '../../../infrastructure/auth-composition.js';

export interface CatalogAdminUseCases<TCreate, TUpdate> {
  create: { execute(actorId: string, body: TCreate, ctx: CatalogAdminCtx): Promise<unknown> };
  update: { execute(actorId: string, id: string, body: TUpdate, ctx: CatalogAdminCtx): Promise<unknown> };
  softDelete: { execute(actorId: string, id: string, reason: string, ctx: CatalogAdminCtx): Promise<unknown> };
  list: { execute(opts: { includeInactive: boolean }): Promise<unknown> };
}

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

/**
 * Enforcement post-Zod de `reason` en DELETE. Zod valida shape (opcional string ≤ 500) sin
 * emitir códigos estables; aquí se distingue `REASON_REQUIRED` (ausente / vacío) de
 * `INVALID_REASON_LENGTH` (fuera de [10..500]) para FE/i18n.
 */
export function assertReason(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') {
    throw new ReasonRequiredError();
  }
  if (typeof raw !== 'string' || raw.length < 10 || raw.length > 500) {
    throw new InvalidReasonLengthError();
  }
  return raw;
}

export class CatalogAdminController<TCreate, TUpdate> {
  constructor(private readonly useCases: CatalogAdminUseCases<TCreate, TUpdate>) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.useCases.list.execute({ includeInactive: true });
    res.status(200).json(success(result, req.correlationId ?? ''));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as TCreate;
    const view = await this.useCases.create.execute(actorId(req), body, {
      correlationId: req.correlationId,
    });
    res.status(201).json(success(view, req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as TUpdate;
    const view = await this.useCases.update.execute(actorId(req), id, body, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(view, req.correlationId ?? ''));
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as { reason?: unknown };
    const reason = assertReason(body.reason);

    const view = await this.useCases.softDelete.execute(actorId(req), id, reason, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(view, req.correlationId ?? ''));
  };
}

export interface CatalogAdminSchemas {
  idParams: ZodTypeAny;
  createBody: ZodTypeAny;
  updateBody: ZodTypeAny;
  deleteBody: ZodTypeAny;
}

export function createCatalogAdminRouter<TCreate, TUpdate>(
  useCases: CatalogAdminUseCases<TCreate, TUpdate>,
  schemas: CatalogAdminSchemas,
): Router {
  const controller = new CatalogAdminController(useCases);
  const router = Router();
  router.use(requireSession, requireRole('admin'));

  router.get('/', asyncHandler(controller.list));
  router.post(
    '/',
    validateRequestMiddleware(z.object({ body: schemas.createBody })),
    asyncHandler(controller.create),
  );
  router.patch(
    '/:id',
    validateRequestMiddleware(z.object({ params: schemas.idParams, body: schemas.updateBody })),
    asyncHandler(controller.update),
  );
  router.delete(
    '/:id',
    validateRequestMiddleware(z.object({ params: schemas.idParams, body: schemas.deleteBody })),
    asyncHandler(controller.softDelete),
  );
  return router;
}
