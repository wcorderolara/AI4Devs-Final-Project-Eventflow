// Controlador de Reviews (organizer) — delegación al `CreateReviewUseCase` (US-065 / BE-004).
// Delgado, sin lógica de negocio (US-090 layering).
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toReviewResponse } from './review.response.js';
import type { CreateReviewBody } from './create-review.dto.js';
import type { CreateReviewUseCase } from '../application/create-review.use-case.js';

function actorId(req: Request): string {
  const u = req.user;
  if (!u?.id) throw new UnauthorizedError();
  return u.id;
}

export class OrganizerReviewController {
  constructor(private readonly createReview: CreateReviewUseCase) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateReviewBody;
    const view = await this.createReview.execute(actorId(req), body, {
      correlationId: req.correlationId,
    });
    res.status(201).json(success(toReviewResponse(view), req.correlationId ?? ''));
  };
}
