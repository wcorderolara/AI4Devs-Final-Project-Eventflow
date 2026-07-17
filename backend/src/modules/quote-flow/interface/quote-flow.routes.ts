// Rutas de quote-flow (US-096 / API-001, SEC-001/002). Doc 16 bajo `/api/v1`. Auth POR RUTA
// (coexisten organizer y vendor). Ownership/assignment se aplican en los use cases (masked 404).
// Debe montarse ANTES de event-planning para capturar `/events/:eventId/quote-requests`.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import {
  PrismaEventAccessReader,
  PrismaVendorProfileReader,
  PrismaServiceCategoryReader,
} from '../../../infrastructure/readers/prisma-access-readers.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaQuoteRequestRepository } from '../infrastructure/prisma-quote-request.repository.js';
import { PrismaQuoteRepository } from '../infrastructure/prisma-quote.repository.js';
import {
  CreateQuoteRequestRequestSchema,
  ListQuoteRequestsQuerySchema,
  EventIdParamSchema,
  QuoteRequestIdParamSchema,
  CreateQuoteRequestBodySchema,
  UpdateQuoteRequestBodySchema,
  QuoteIdParamSchema,
} from '../dto/index.js';
import {
  CreateQuoteRequestUseCase,
  ListEventQuoteRequestsUseCase,
  ListVendorQuoteRequestsUseCase,
  GetQuoteRequestUseCase,
  MarkQuoteRequestViewedUseCase,
} from '../application/quote-request.use-cases.js';
// US-056 (PB-P1-034 / BE-004/005): cancelación transaccional + notifications + check
// `confirmed_intent` (reemplaza `CancelQuoteRequestUseCase` de US-096 en el wiring — DEV-02).
import { CancelQuoteRequestUs056UseCase } from '../application/cancel-quote-request.us056.use-case.js';
import { cancelQuoteRequestBodySchema } from '../dto/cancel-quote-request.us056.request.js';
// US-057 (PB-P1-035 / BE-004/005): comparador de Quotes por categoría (sólo lectura).
import { CompareQuotesUseCase } from '../application/compare-quotes.us057.use-case.js';
import {
  CompareQuotesEventIdParamSchema,
  CompareQuotesQuerySchema,
} from '../dto/compare-quotes.us057.query.js';
import {
  CreateQuoteUseCase,
  GetQuoteForQuoteRequestUseCase,
  UpdateQuoteUseCase,
  SendQuoteUseCase,
  AcceptQuoteUseCase,
  PreferQuoteUseCase,
} from '../application/quote.use-cases.js';
// US-054 (PB-P1-032): rechazo transaccional con notifications atómicas (reemplaza el
// `RejectQuoteUseCase` original de US-096 — ver DEV-02 del execution record).
import { RejectQuoteUs054UseCase } from '../application/reject-quote.us054.use-case.js';
// US-056 (BE-002): service común genérico — soporta `quote.rejected`, `quote.expired`,
// `quote_request.cancelled`. Reemplaza al `QuoteNotificationService` (US-054) sin duplicar rutas.
import { QuoteEventNotificationService } from '../services/quote-event-notification.service.js';
import { PrismaQuoteNotificationSenderAdapter } from '../../../infrastructure/notifications/prisma-quote-notification-sender.adapter.js';
import { prisma } from '../../../infrastructure/prisma/client.js';
import { rejectQuoteBodySchema } from '../dto/reject-quote.us054.request.js';
import { QuoteRequestsController, QuotesController } from './quote-flow.controllers.js';

const events = new PrismaEventAccessReader();
const vendors = new PrismaVendorProfileReader();
const categories = new PrismaServiceCategoryReader();
const logger = new StructuredDomainEventLogger();
const quoteRequests = new PrismaQuoteRequestRepository();
const quotes = new PrismaQuoteRepository();

// US-054 (PB-P1-032 / BE-002/003) + US-056 (BE-002): servicio común genérico + adapter Prisma
// reutilizado desde US-049. Emite `quote.rejected` (US-054), `quote.expired` (US-053) y
// `quote_request.cancelled` (US-056).
const notifications = new PrismaQuoteNotificationSenderAdapter(prisma);
const quoteEvents = new QuoteEventNotificationService(notifications, logger);

const qrController = new QuoteRequestsController({
  create: new CreateQuoteRequestUseCase(quoteRequests, events, vendors, categories, logger),
  listByEvent: new ListEventQuoteRequestsUseCase(quoteRequests, events),
  listByVendor: new ListVendorQuoteRequestsUseCase(quoteRequests, vendors),
  get: new GetQuoteRequestUseCase(quoteRequests, events, vendors),
  cancel: new CancelQuoteRequestUs056UseCase(quoteEvents, clock, logger, prisma),
  markViewed: new MarkQuoteRequestViewedUseCase(quoteRequests, vendors, clock, logger),
  compareQuotes: new CompareQuotesUseCase(quotes, events, categories, logger),
});

const quoteController = new QuotesController({
  create: new CreateQuoteUseCase(quotes, quoteRequests, events, vendors, logger),
  getForRequest: new GetQuoteForQuoteRequestUseCase(quotes, quoteRequests, events, vendors),
  update: new UpdateQuoteUseCase(quotes, quoteRequests, events, vendors, logger),
  send: new SendQuoteUseCase(quotes, vendors, clock, logger),
  accept: new AcceptQuoteUseCase(quotes, quoteRequests, events, clock, logger),
  reject: new RejectQuoteUs054UseCase(quoteEvents, clock, logger, prisma),
  prefer: new PreferQuoteUseCase(quotes, quoteRequests, events, logger),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizer = roleMiddleware(['organizer']);
const vendor = roleMiddleware(['vendor']);
const organizerOrVendor = roleMiddleware(['organizer', 'vendor']);
const v = validateRequestMiddleware;

export const quoteFlowRouter = Router();

// ── QuoteRequest ──────────────────────────────────────────────────────────
quoteFlowRouter.get(
  '/events/:eventId/quote-requests',
  sessionAuth,
  organizer,
  v(z.object({ params: EventIdParamSchema, query: ListQuoteRequestsQuerySchema })),
  asyncHandler(qrController.listByEvent),
);
quoteFlowRouter.post(
  '/events/:eventId/quote-requests',
  sessionAuth,
  organizer,
  v(z.object({ params: EventIdParamSchema, body: CreateQuoteRequestRequestSchema })),
  asyncHandler(qrController.create),
);
quoteFlowRouter.get(
  '/vendors/me/quote-requests',
  sessionAuth,
  vendor,
  v(z.object({ query: ListQuoteRequestsQuerySchema })),
  asyncHandler(qrController.listByVendor),
);
quoteFlowRouter.get(
  '/quote-requests/:quoteRequestId',
  sessionAuth,
  organizerOrVendor,
  v(z.object({ params: QuoteRequestIdParamSchema })),
  asyncHandler(qrController.get),
);
// US-056 (PB-P1-034 / BE-005): body opcional `{ reason?: string [0..500] }`. Se preserva
// el verbo PATCH y la ruta existente (US-096) — DEV-02 evita duplicar `/organizer/...`.
quoteFlowRouter.patch(
  '/quote-requests/:quoteRequestId/cancel',
  sessionAuth,
  organizer,
  v(z.object({ params: QuoteRequestIdParamSchema, body: cancelQuoteRequestBodySchema })),
  asyncHandler(qrController.cancel),
);
quoteFlowRouter.patch(
  '/quote-requests/:quoteRequestId/viewed',
  sessionAuth,
  vendor,
  v(z.object({ params: QuoteRequestIdParamSchema })),
  asyncHandler(qrController.markViewed),
);
// US-057 (PB-P1-035 / BE-005): comparador de Quotes por categoría. Sólo organizer dueño del
// evento (ownership dentro del use case → `404 EVENT_NOT_FOUND` uniforme). El param canónico
// es `:id` (no `:eventId`) según §7 del Tech Spec.
quoteFlowRouter.get(
  '/events/:id/quotes/compare',
  sessionAuth,
  organizer,
  v(z.object({ params: CompareQuotesEventIdParamSchema, query: CompareQuotesQuerySchema })),
  asyncHandler(qrController.compareQuotes),
);

// ── Quote ─────────────────────────────────────────────────────────────────
quoteFlowRouter.get(
  '/quote-requests/:quoteRequestId/quote',
  sessionAuth,
  organizerOrVendor,
  v(z.object({ params: QuoteRequestIdParamSchema })),
  asyncHandler(quoteController.getForRequest),
);
quoteFlowRouter.post(
  '/quote-requests/:quoteRequestId/quote',
  sessionAuth,
  vendor,
  v(z.object({ params: QuoteRequestIdParamSchema, body: CreateQuoteRequestBodySchema })),
  asyncHandler(quoteController.create),
);
quoteFlowRouter.patch(
  '/quotes/:quoteId',
  sessionAuth,
  vendor,
  v(z.object({ params: QuoteIdParamSchema, body: UpdateQuoteRequestBodySchema })),
  asyncHandler(quoteController.update),
);
quoteFlowRouter.post('/quotes/:quoteId/send', sessionAuth, vendor, v(z.object({ params: QuoteIdParamSchema })), asyncHandler(quoteController.send));
quoteFlowRouter.post('/quotes/:quoteId/accept', sessionAuth, organizer, v(z.object({ params: QuoteIdParamSchema })), asyncHandler(quoteController.accept));
// US-054 (PB-P1-032 / BE-005): body opcional `{ reason?: string [0..500] }`.
quoteFlowRouter.post(
  '/quotes/:quoteId/reject',
  sessionAuth,
  organizer,
  v(z.object({ params: QuoteIdParamSchema, body: rejectQuoteBodySchema })),
  asyncHandler(quoteController.reject),
);
quoteFlowRouter.post('/quotes/:quoteId/prefer', sessionAuth, organizer, v(z.object({ params: QuoteIdParamSchema })), asyncHandler(quoteController.prefer));
