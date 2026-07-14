// US-036 (PB-P1-020 / BE-007, R1) — Controller unificado de las 3 mutaciones sobre BudgetItem.
// Composición canónica US-111 (`auth → role → handler`) definida en el router.
// Validaciones:
//  * Path params → Zod (`INVALID_PARAMS` mapea a 400 VALIDATION_ERROR).
//  * Body → Zod `.strict()` (`INVALID_FIELD` para campos no permitidos → 400 VALIDATION_ERROR).
// Respuestas:
//  * POST → 201 con `Location` header + `BudgetItemDto`.
//  * PATCH → 200 con `BudgetItemDto`.
//  * DELETE → 204 (sin body).
import type { Request, Response } from 'express';
import { success } from '../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/unauthorized.error.js';
import { createBudgetItemBodySchema } from '../../dto/create-budget-item.body.js';
import { updateBudgetItemBodySchema } from '../../dto/update-budget-item.body.js';
import type { CreateBudgetItemUseCase } from '../../application/create-budget-item.use-case.js';
import type { UpdateBudgetItemUseCase } from '../../application/update-budget-item.use-case.js';
import type { DeleteBudgetItemUseCase } from '../../application/delete-budget-item.use-case.js';
import {
  createBudgetItemParamsSchema,
  updateBudgetItemParamsSchema,
  deleteBudgetItemParamsSchema,
} from './budget-item-mutation.schemas.js';

const API_V1_PREFIX = '/api/v1';

export class BudgetItemMutationController {
  constructor(
    private readonly createUseCase: CreateBudgetItemUseCase,
    private readonly updateUseCase: UpdateBudgetItemUseCase,
    private readonly deleteUseCase: DeleteBudgetItemUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    const params = createBudgetItemParamsSchema.parse(req.params);
    const body = createBudgetItemBodySchema.parse(req.body ?? {});

    const dto = await this.createUseCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      body,
      correlationId: req.correlationId ?? '',
    });

    res.setHeader(
      'Location',
      `${API_V1_PREFIX}/events/${params.eventId}/budget/items/${dto.id}`,
    );
    res.status(201).json(success(dto, req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    const params = updateBudgetItemParamsSchema.parse(req.params);
    const body = updateBudgetItemBodySchema.parse(req.body ?? {});

    const dto = await this.updateUseCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      itemId: params.itemId,
      body,
      correlationId: req.correlationId ?? '',
    });

    res.status(200).json(success(dto, req.correlationId ?? ''));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    const params = deleteBudgetItemParamsSchema.parse(req.params);

    await this.deleteUseCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      itemId: params.itemId,
      correlationId: req.correlationId ?? '',
    });

    res.status(204).end();
  };
}
