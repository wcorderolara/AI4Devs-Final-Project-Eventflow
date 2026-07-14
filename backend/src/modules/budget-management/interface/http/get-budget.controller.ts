// US-035 (PB-P1-020 / BE-004, R1) — Controller delgado de `GET /events/:eventId/budget`.
// Composición (auth → role → handler) vive en `get-budget.routes.ts`. El controller valida el
// path param con Zod (400 VALIDATION si UUID inválido), delega al use case y serializa el
// response canónico con el helper `success()` (VR-04, ADR-API-002).
//
// AC-04 (R1): payload `{ summary, items }` sin `paid`/`paid_total`/`ai_generated`.
import type { Request, Response } from 'express';
import { success } from '../../../../shared/response/index.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/unauthorized.error.js';
import type { GetBudgetUseCase } from '../../application/get-budget.use-case.js';
import { getBudgetParamsSchema } from './get-budget.schema.js';

export class GetBudgetController {
  constructor(private readonly useCase: GetBudgetUseCase) {}

  handle = async (req: Request, res: Response): Promise<void> => {
    const actor = req.user;
    if (!actor) throw new UnauthorizedError();

    // VR-02 / NT-05: UUID inválido → ValidationError → 400.
    const params = getBudgetParamsSchema.parse(req.params);

    const result = await this.useCase.execute({
      actorId: actor.id,
      eventId: params.eventId,
      correlationId: req.correlationId ?? '',
    });

    // R1: envelope canónico `{ data: { summary, items }, meta }`. Los consumidores frontend
    // acceden a `response.data.summary` y `response.data.items`.
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
