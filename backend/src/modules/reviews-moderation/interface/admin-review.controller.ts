// Controlador Admin de Reviews — delega en `ModerateReviewUseCase` (US-067 / BE-004) y en
// `ListReviewsForAdminUseCase` (US-077 / BE-003). Delgado, sin lógica de negocio.
// `currentUserId` viene del `req.user` hidratado por `sessionAuth` — el guard admin ya filtró
// a rol `admin` en el router.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type {
  ModerateReviewBody,
  ModerateReviewParams,
} from './moderate-review.dto.js';
import type { ModerateReviewUseCase } from '../application/moderate-review.use-case.js';
import type { ListReviewsForAdminUseCase } from '../application/list-reviews-for-admin.use-case.js';
import type { AdminReviewsQuery } from './admin-reviews-query.dto.js';

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

export class AdminReviewController {
  constructor(
    private readonly moderateReview: ModerateReviewUseCase,
    private readonly listReviews: ListReviewsForAdminUseCase,
  ) {}

  moderate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as ModerateReviewParams;
    const body = req.validated?.body as ModerateReviewBody;

    const view = await this.moderateReview.execute(actorId(req), id, body, {
      correlationId: req.correlationId,
    });

    res.status(200).json(success(view, req.correlationId ?? ''));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    // Query validada por Zod strict + refines cross-field antes de entrar aquí.
    const query = req.validated?.query as AdminReviewsQuery;
    const result = await this.listReviews.execute(query);
    res.status(200).json(success(result, req.correlationId ?? ''));
  };
}
