// Controlador Admin de Reviews — delega en `ModerateReviewUseCase` (US-067 / BE-004).
// Delgado, sin lógica de negocio (Doc 14 §layering). `currentUserId` viene del `req.user`
// hidratado por `sessionAuth` — el guard admin ya filtró a rol `admin`.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type {
  ModerateReviewBody,
  ModerateReviewParams,
} from './moderate-review.dto.js';
import type { ModerateReviewUseCase } from '../application/moderate-review.use-case.js';

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

export class AdminReviewController {
  constructor(private readonly moderateReview: ModerateReviewUseCase) {}

  moderate = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validated?.params as ModerateReviewParams;
    const body = req.validated?.body as ModerateReviewBody;

    const view = await this.moderateReview.execute(actorId(req), id, body, {
      correlationId: req.correlationId,
    });

    res.status(200).json(success(view, req.correlationId ?? ''));
  };
}
