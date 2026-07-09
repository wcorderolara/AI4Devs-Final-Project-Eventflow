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
  CancelQuoteRequestUseCase,
  MarkQuoteRequestViewedUseCase,
} from '../application/quote-request.use-cases.js';
import {
  CreateQuoteUseCase,
  GetQuoteForQuoteRequestUseCase,
  UpdateQuoteUseCase,
  SendQuoteUseCase,
  AcceptQuoteUseCase,
  RejectQuoteUseCase,
  PreferQuoteUseCase,
} from '../application/quote.use-cases.js';
import { QuoteRequestsController, QuotesController } from './quote-flow.controllers.js';

const events = new PrismaEventAccessReader();
const vendors = new PrismaVendorProfileReader();
const categories = new PrismaServiceCategoryReader();
const logger = new StructuredDomainEventLogger();
const quoteRequests = new PrismaQuoteRequestRepository();
const quotes = new PrismaQuoteRepository();

const qrController = new QuoteRequestsController({
  create: new CreateQuoteRequestUseCase(quoteRequests, events, vendors, categories, logger),
  listByEvent: new ListEventQuoteRequestsUseCase(quoteRequests, events),
  listByVendor: new ListVendorQuoteRequestsUseCase(quoteRequests, vendors),
  get: new GetQuoteRequestUseCase(quoteRequests, events, vendors),
  cancel: new CancelQuoteRequestUseCase(quoteRequests, events, clock, logger),
  markViewed: new MarkQuoteRequestViewedUseCase(quoteRequests, vendors, clock, logger),
});

const quoteController = new QuotesController({
  create: new CreateQuoteUseCase(quotes, quoteRequests, events, vendors, logger),
  getForRequest: new GetQuoteForQuoteRequestUseCase(quotes, quoteRequests, events, vendors),
  update: new UpdateQuoteUseCase(quotes, quoteRequests, events, vendors, logger),
  send: new SendQuoteUseCase(quotes, vendors, clock, logger),
  accept: new AcceptQuoteUseCase(quotes, quoteRequests, events, clock, logger),
  reject: new RejectQuoteUseCase(quotes, quoteRequests, events, clock, logger),
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
quoteFlowRouter.patch(
  '/quote-requests/:quoteRequestId/cancel',
  sessionAuth,
  organizer,
  v(z.object({ params: QuoteRequestIdParamSchema })),
  asyncHandler(qrController.cancel),
);
quoteFlowRouter.patch(
  '/quote-requests/:quoteRequestId/viewed',
  sessionAuth,
  vendor,
  v(z.object({ params: QuoteRequestIdParamSchema })),
  asyncHandler(qrController.markViewed),
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
quoteFlowRouter.post('/quotes/:quoteId/reject', sessionAuth, organizer, v(z.object({ params: QuoteIdParamSchema })), asyncHandler(quoteController.reject));
quoteFlowRouter.post('/quotes/:quoteId/prefer', sessionAuth, organizer, v(z.object({ params: QuoteIdParamSchema })), asyncHandler(quoteController.prefer));
