// Router de endpoints canónicos del organizer sobre `QuoteRequest`:
//   - `POST /api/v1/quote-requests` (US-049): crea QR + 2 notifications atómicas.
//   - `GET /api/v1/quote-requests/active-count` (US-050): pre-check UX del límite BR-QUOTE-009.
// Coexisten con `POST /api/v1/events/:eventId/quote-requests` (US-096) — ver DEV-03 US-049.
// Pipeline seguro: sessionAuth → organizerRoleGuard → rateLimit(POST) → validate → handler.
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
import { PrismaQuoteRequestActiveCounterAdapter } from '../../../infrastructure/quote-flow/prisma-quote-request-active-counter.adapter.js';
import { CreateQuoteRequestUs049UseCase } from '../application/create-quote-request.us049.use-case.js';
import { GetActiveQrCountUs050UseCase } from '../application/get-active-qr-count.us050.use-case.js';
import {
  createQuoteRequestUs049BodySchema,
  type CreateQuoteRequestUs049Body,
} from '../dto/create-quote-request.us049.request.js';
import {
  activeQrCountUs050QuerySchema,
  type ActiveQrCountUs050Query,
} from '../dto/active-qr-count.us050.query.js';
import { prisma } from '../../../infrastructure/prisma/client.js';

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizerOnly = roleMiddleware(['organizer']);
const validate = validateRequestMiddleware;

const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const activeCounter = new PrismaQuoteRequestActiveCounterAdapter(prisma);
const logger = new StructuredDomainEventLogger();

const createUseCase = new CreateQuoteRequestUs049UseCase(prisma, notifications, logger);
const activeCountUseCase = new GetActiveQrCountUs050UseCase(activeCounter, prisma);

async function createQuoteRequestHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const body = req.validated?.body as CreateQuoteRequestUs049Body;
  const response = await createUseCase.execute(userId, body, { correlationId: req.correlationId });
  res.status(201).json(success(response, req.correlationId ?? ''));
}

async function activeCountHandler(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  const query = req.validated?.query as ActiveQrCountUs050Query;
  const response = await activeCountUseCase.execute(userId, query);
  res.status(200).json(success(response, req.correlationId ?? ''));
}

export const us049QuoteRequestsRouter = Router();

// US-049: POST canónico con rate limit 10 req/min.
us049QuoteRequestsRouter.post(
  '/quote-requests',
  sessionAuth,
  organizerOnly,
  quoteRequestRateLimit,
  validate(z.object({ body: createQuoteRequestUs049BodySchema })),
  asyncHandler(createQuoteRequestHandler),
);

// US-050: GET pre-check del límite BR-QUOTE-009. Sólo lectura; usa el rate limit global.
us049QuoteRequestsRouter.get(
  '/quote-requests/active-count',
  sessionAuth,
  organizerOnly,
  validate(z.object({ query: activeQrCountUs050QuerySchema })),
  asyncHandler(activeCountHandler),
);
