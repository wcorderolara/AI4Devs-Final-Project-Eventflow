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
import { logger } from '../../../shared/infrastructure/logger/index.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteRequestActiveCounterAdapter } from '../../../infrastructure/quote-flow/prisma-quote-request-active-counter.adapter.js';
import { CreateQuoteRequestUs049UseCase } from '../application/create-quote-request.us049.use-case.js';
import { GetActiveQrCountUs050UseCase } from '../application/get-active-qr-count.us050.use-case.js';
// US-068 (PB-P2-005 / BE-005): wiring del handler `quote_request_received` in-tx.
import { OnQuoteRequestCreatedHandler } from '../../notifications/application/on-quote-request-created.handler.js';
import { PrismaNotificationQrReceivedRepository } from '../../notifications/infrastructure/prisma-notification-qr-received.repository.js';
import { LoggingSimulatedQrReceivedEmailAdapter } from '../../notifications/infrastructure/logging-simulated-qr-received-email.adapter.js';
import { PrismaOrganizerLanguageLookup } from '../../event-planning/infrastructure/prisma-organizer-language.lookup.js';
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

const activeCounter = new PrismaQuoteRequestActiveCounterAdapter(prisma);
const domainLogger = new StructuredDomainEventLogger();

// US-068 (BE-005): composition root del `OnQuoteRequestCreatedHandler`. `PrismaOrganizerLanguageLookup`
// se reutiliza structurally como `VendorLanguagePreferenceReader` (mismo shape). Los adapters
// aceptan el `tx` opcional cuando el handler los invoque dentro de la transacción del UC.
const onQrCreatedHandler = new OnQuoteRequestCreatedHandler({
  notificationRepo: new PrismaNotificationQrReceivedRepository(prisma),
  languageLookup: new PrismaOrganizerLanguageLookup(prisma),
  emailAdapter: new LoggingSimulatedQrReceivedEmailAdapter(logger),
  logger,
});

const createUseCase = new CreateQuoteRequestUs049UseCase(prisma, onQrCreatedHandler, domainLogger);
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
