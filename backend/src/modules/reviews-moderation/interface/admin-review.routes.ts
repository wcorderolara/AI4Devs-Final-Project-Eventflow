// Rutas Admin Reviews (US-067 + US-077 / BE-003).
//
//   POST /api/v1/admin/reviews/:id/moderate  (US-067 · BE-004) → moderación atómica.
//   GET  /api/v1/admin/reviews               (US-077 · BE-003) → listado paginado + filtros.
//
// Auth: `sessionAuth` + `roleMiddleware(['admin'])` — organizer/vendor ⇒ 403; sin sesión ⇒ 401.
// El orden canónico por request es: sessionAuth → adminOnly → validateRequest (Zod strict) →
// handler. Reusa `roleMiddleware(['admin'])` existente sin introducir un guard nuevo.
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
import { ListReviewsForAdminUseCase } from '../application/list-reviews-for-admin.use-case.js';
import { AdminReviewController } from './admin-review.controller.js';
import {
  ModerateReviewBodySchema,
  ModerateReviewParamsSchema,
} from './moderate-review.dto.js';
import { AdminReviewsQuerySchema } from './admin-reviews-query.dto.js';

// Composition root del sub-módulo Admin Reviews. Reusa las mismas primitivas de
// auth/clock/logger que el resto del pipeline; no crea instancias singleton globales.
const logger = new StructuredDomainEventLogger();
const moderateReviewUseCase = new ModerateReviewUseCase(clock, logger, prisma);
const listReviewsUseCase = new ListReviewsForAdminUseCase(prisma);
const controller = new AdminReviewController(moderateReviewUseCase, listReviewsUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const adminOnly = roleMiddleware(['admin']);

export const adminReviewRouter = Router();

// Guards comunes: sesión válida + rol admin ANTES de validación (paridad con adminEventsRouter).
adminReviewRouter.use(sessionAuth, adminOnly);

// US-077: listado paginado admin — se registra ANTES del `/:id/moderate` para preservar orden
// de match; Express no colisiona (`GET /` vs `POST /:id/moderate`) pero preserva la convención
// "más específico primero" del resto del pipeline.
adminReviewRouter.get(
  '/',
  validateRequestMiddleware(z.object({ query: AdminReviewsQuerySchema })),
  asyncHandler(controller.list),
);

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
