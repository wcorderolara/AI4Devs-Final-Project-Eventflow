// Rutas Admin Reviews — `POST /api/v1/admin/reviews/:id/moderate` (US-067 / BE-004).
// Doc 16 §M07. Auth: `sessionAuth` + `roleMiddleware(['admin'])` — organizer/vendor ⇒ 403
// (SEC-01, AUTH-TS-02/AUTH-TS-03); sin sesión ⇒ 401 (AUTH-TS-04). Uniformidad 404
// `REVIEW_NOT_FOUND` (SEC-05, Decisión PO D6) se aplica dentro del `ModerateReviewUseCase`.
//
// El orden canónico por request es: sessionAuth → adminOnly (guard rol) → validateRequest
// (Zod params+body strict) → handler. Reusa `roleMiddleware(['admin'])` que ya opera en
// `adminEventsRouter` (US-016) y `seedDemoRouter` (US-086) — no se introduce un guard nuevo.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { ModerateReviewUseCase } from '../application/moderate-review.use-case.js';
import { AdminReviewController } from './admin-review.controller.js';
import {
  ModerateReviewBodySchema,
  ModerateReviewParamsSchema,
} from './moderate-review.dto.js';

// Composition root del sub-módulo Admin Reviews (US-067). Reusa las mismas primitivas de
// auth/clock/logger que el resto del pipeline; no crea instancias singleton globales.
const logger = new StructuredDomainEventLogger();
const moderateReviewUseCase = new ModerateReviewUseCase(clock, logger, prisma);
const controller = new AdminReviewController(moderateReviewUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminReviewRouter = Router();

// Guards comunes: sesión válida + rol admin ANTES de validación (paridad con adminEventsRouter).
adminReviewRouter.use(sessionAuth, adminOnly);

adminReviewRouter.post(
  '/:id/moderate',
  validateRequestMiddleware(
    z.object({
      params: ModerateReviewParamsSchema,
      body: ModerateReviewBodySchema,
    }),
  ),
  asyncHandler(controller.moderate),
);
