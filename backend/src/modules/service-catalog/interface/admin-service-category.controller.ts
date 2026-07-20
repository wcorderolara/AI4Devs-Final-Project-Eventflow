// Controlador Admin de `ServiceCategory` (US-075). Delegación fina a los 4 UseCases.
// El guard `sessionAuth + roleMiddleware(['admin'])` lo aplica la route ANTES; el
// `validateRequestMiddleware` valida shape antes de invocar el controller.
//
// Sobre `reason` en DELETE: la validación de longitud [10..500] no vive en el DTO Zod
// (para emitir códigos estables distintos, no un `VALIDATION_ERROR` genérico). Este
// controller detecta `REASON_REQUIRED` (ausente) vs `INVALID_REASON_LENGTH` (fuera de
// rango) y dispara los errores de dominio con `code` estable del catálogo.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import {
  InvalidReasonLengthError,
  ReasonRequiredError,
} from '../domain/us075.errors.js';
import type { CreateServiceCategoryUseCase } from '../application/create-service-category.use-case.js';
import type { UpdateServiceCategoryUseCase } from '../application/update-service-category.use-case.js';
import type { SoftDeleteServiceCategoryUseCase } from '../application/soft-delete-service-category.use-case.js';
import type { ListServiceCategoriesUseCase } from '../application/list-service-categories.use-case.js';
import type {
  CreateServiceCategoryBody,
  DeleteServiceCategoryBody,
  ServiceCategoryIdParams,
  UpdateServiceCategoryBody,
} from './service-category.dto.js';

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

export class AdminServiceCategoryController {
  constructor(
    private readonly createUC: CreateServiceCategoryUseCase,
    private readonly updateUC: UpdateServiceCategoryUseCase,
    private readonly softDeleteUC: SoftDeleteServiceCategoryUseCase,
    private readonly listUC: ListServiceCategoriesUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.listUC.execute({ includeInactive: true });
    res.status(200).json(success(result, req.correlationId ?? ''));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateServiceCategoryBody;
    const view = await this.createUC.execute(actorId(req), body, {
      correlationId: req.correlationId,
    });
    res.status(201).json(success(view, req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as ServiceCategoryIdParams;
    const body = req.validated?.body as UpdateServiceCategoryBody;
    const view = await this.updateUC.execute(actorId(req), id, body, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(view, req.correlationId ?? ''));
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as ServiceCategoryIdParams;
    const body = req.validated?.body as DeleteServiceCategoryBody;
    const reason = assertReason(body.reason);

    const view = await this.softDeleteUC.execute(actorId(req), id, reason, {
      correlationId: req.correlationId,
    });
    res.status(200).json(success(view, req.correlationId ?? ''));
  };
}

/**
 * Enforcement post-Zod. Zod valida shape (opcional string ≤ 500) sin emitir códigos
 * estables. Aquí se produce el error específico esperado por FE/i18n.
 */
function assertReason(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') {
    throw new ReasonRequiredError();
  }
  if (typeof raw !== 'string' || raw.length < 10 || raw.length > 500) {
    throw new InvalidReasonLengthError();
  }
  return raw;
}
