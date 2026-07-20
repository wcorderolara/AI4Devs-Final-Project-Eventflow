// Rutas Reviews (organizer) — `POST /api/v1/organizer/reviews` (US-065 / BE-004).
// Doc 16 §M07. Auth: `sessionAuth` + `roleMiddleware(['organizer'])` — vendor/admin ⇒ 403
// (SEC-01, AUTH-TS-04/AUTH-TS-05); sin sesión ⇒ 401 (AUTH-TS-06). Uniformidad 404 (SEC-04)
// se aplica dentro del `CreateReviewUseCase`.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { QuoteEventNotificationService } from '../../quote-flow/services/quote-event-notification.service.js';
import { CreateReviewUseCase } from '../application/create-review.use-case.js';
import { OrganizerReviewController } from './organizer-review.controller.js';
import { CreateReviewRequestSchema } from './create-review.dto.js';

// Composition root del módulo Reviews (US-065). Reusa el mismo `QuoteEventNotificationService`
// extendido a 9 eventos y el adapter Prisma de notificaciones (US-049 BE-003).
const logger = new StructuredDomainEventLogger();
const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const reviewEvents = new QuoteEventNotificationService(notifications, logger);
const createReviewUseCase = new CreateReviewUseCase(reviewEvents, clock, logger, prisma);
const controller = new OrganizerReviewController(createReviewUseCase);

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizer = roleMiddleware(['organizer']);

export const organizerReviewRouter = Router();

organizerReviewRouter.post(
  '/',
  sessionAuth,
  organizer,
  validateRequestMiddleware(z.object({ body: CreateReviewRequestSchema })),
  asyncHandler(controller.create),
);
