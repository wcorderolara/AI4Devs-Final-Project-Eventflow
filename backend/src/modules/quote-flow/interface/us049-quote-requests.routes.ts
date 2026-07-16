// Router del endpoint canónico US-049: `POST /api/v1/quote-requests` (Tech Spec §7 / §9).
// Coexiste con `POST /api/v1/events/:eventId/quote-requests` (US-096) — ver DEV-03 del execution
// record. La ruta corre el pipeline seguro: sessionAuth → organizerRoleGuard → rateLimit(10/min) →
// validateRequestMiddleware(body). El handler delega en `CreateQuoteRequestUs049UseCase` que hace
// toda la orquestación transaccional (SELECT FOR UPDATE + inserción atómica QR + 2 Notifications).
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { quoteRequestRateLimit } from '../../../shared/interface/http/quote-request-rate-limit.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { CreateQuoteRequestUs049UseCase } from '../application/create-quote-request.us049.use-case.js';
import {
  createQuoteRequestUs049BodySchema,
  type CreateQuoteRequestUs049Body,
} from '../dto/create-quote-request.us049.request.js';
import { prisma } from '../../../infrastructure/prisma/client.js';

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);
const validate = validateRequestMiddleware;

const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const logger = new StructuredDomainEventLogger();
const createUseCase = new CreateQuoteRequestUs049UseCase(prisma, notifications, logger);

async function createQuoteRequestHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const body = req.validated?.body as CreateQuoteRequestUs049Body;
  const response = await createUseCase.execute(userId, body, { correlationId: req.correlationId });
  res.status(201).json(success(response, req.correlationId ?? ''));
}

export const us049QuoteRequestsRouter = Router();

us049QuoteRequestsRouter.post(
  '/quote-requests',
  sessionAuth,
  organizerOnly,
  quoteRequestRateLimit,
  validate(z.object({ body: createQuoteRequestUs049BodySchema })),
  asyncHandler(createQuoteRequestHandler),
);
