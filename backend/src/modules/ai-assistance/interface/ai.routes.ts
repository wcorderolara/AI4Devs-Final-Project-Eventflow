// Rutas de ai-assistance (US-097 / API-001, SEC). Doc 16 bajo `/api/v1`. Auth por ruta;
// ownership/assignment en use cases (masked 404). Generación: rate limit AI + provider tras auth.
// Montar ANTES de event-planning para `/events/:eventId/ai/*`. NO existe ruta genérica de prompt/chat.
import { Router } from 'express';
import { z } from 'zod';
import { validateRequestMiddleware } from '../../../shared/interface/middlewares/validate-request.middleware.js';
import { roleMiddleware } from '../../../shared/interface/middlewares/role.middleware.js';
import { createSessionAuthMiddleware } from '../../../shared/interface/http/session-auth.js';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { composeProtectedRoute } from '../../../shared/interface/http/compose-route.js';
import { aiGenerationRateLimit } from '../../../shared/interface/http/ai-rate-limit.js';
import { sessionRepository, clock } from '../../../infrastructure/auth-composition.js';
import {
  PrismaEventAccessReader,
  PrismaVendorProfileReader,
  PrismaQuoteRequestEventReader,
} from '../../../infrastructure/readers/prisma-access-readers.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaAIRecommendationRepository } from '../infrastructure/prisma-ai-recommendation.repository.js';
import { createLlmProvider } from '../infrastructure/llm-provider.factory.js';
import { AiGenerationService } from '../application/ai-generation.service.js';
import { GenerateAiRecommendationUseCase } from '../application/generate-ai-recommendation.use-case.js';
import {
  GetAIRecommendationUseCase,
  ApplyAIRecommendationUseCase,
  DiscardAIRecommendationUseCase,
} from '../application/ai-recommendation-actions.use-cases.js';
import {
  AiBaseRequestSchema,
  EventIdParamSchema,
  QuoteRequestIdParamSchema,
  AiRecommendationIdParamSchema,
  ApplyAiRecommendationSchema,
} from '../dto/index.js';
import { AIAssistanceController, AIRecommendationsController } from './ai.controllers.js';

const repo = new PrismaAIRecommendationRepository();
const logger = new StructuredDomainEventLogger();
const generationService = new AiGenerationService(createLlmProvider());
const generateUseCase = new GenerateAiRecommendationUseCase(
  repo,
  generationService,
  new PrismaEventAccessReader(),
  new PrismaVendorProfileReader(),
  new PrismaQuoteRequestEventReader(),
  logger,
);
const assistance = new AIAssistanceController(generateUseCase);
const recommendations = new AIRecommendationsController({
  get: new GetAIRecommendationUseCase(repo),
  apply: new ApplyAIRecommendationUseCase(repo, logger),
  discard: new DiscardAIRecommendationUseCase(repo, logger),
});

const sessionAuth = createSessionAuthMiddleware({ sessions: sessionRepository, clock });
const organizer = roleMiddleware(['organizer']);
const vendor = roleMiddleware(['vendor']);
const owner = roleMiddleware(['organizer', 'vendor']);
const v = validateRequestMiddleware;

export const aiAssistanceRouter = Router();

// ── Event-scoped (organizer owner) ─────────────────────────────────────────
const eventBody = z.object({ params: EventIdParamSchema, body: AiBaseRequestSchema });
for (const [path, handler] of [
  ['event-plan', assistance.eventPlan],
  ['checklist', assistance.checklist],
  ['budget-suggestion', assistance.budgetSuggestion],
  ['vendor-categories', assistance.vendorCategories],
  ['quote-brief', assistance.quoteBrief],
  ['task-prioritization', assistance.taskPrioritization],
] as const) {
  // US-111: composición canónica `auth → role → rateLimit → validation → handler` (orden idéntico).
  aiAssistanceRouter.post(
    `/events/:eventId/ai/${path}`,
    ...composeProtectedRoute({
      auth: sessionAuth,
      role: organizer,
      rateLimit: aiGenerationRateLimit,
      validation: v(eventBody),
      handler: asyncHandler(handler),
    }),
  );
}

// ── Quote comparison (organizer owner del evento del QuoteRequest) ─────────
aiAssistanceRouter.post(
  '/quote-requests/:quoteRequestId/ai/comparison-summary',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: organizer,
    rateLimit: aiGenerationRateLimit,
    validation: v(z.object({ params: QuoteRequestIdParamSchema, body: AiBaseRequestSchema })),
    handler: asyncHandler(assistance.comparisonSummary),
  }),
);

// ── Vendor bio (vendor con perfil propio) ──────────────────────────────────
aiAssistanceRouter.post(
  '/vendors/me/ai/bio',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: vendor,
    rateLimit: aiGenerationRateLimit,
    validation: v(z.object({ body: AiBaseRequestSchema })),
    handler: asyncHandler(assistance.vendorBio),
  }),
);

// ── AIRecommendation actions (owner) ───────────────────────────────────────
aiAssistanceRouter.get(
  '/ai-recommendations/:aiRecommendationId',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: owner,
    validation: v(z.object({ params: AiRecommendationIdParamSchema })),
    handler: asyncHandler(recommendations.get),
  }),
);
aiAssistanceRouter.post(
  '/ai-recommendations/:aiRecommendationId/apply',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: owner,
    validation: v(z.object({ params: AiRecommendationIdParamSchema, body: ApplyAiRecommendationSchema })),
    handler: asyncHandler(recommendations.apply),
  }),
);
aiAssistanceRouter.post(
  '/ai-recommendations/:aiRecommendationId/discard',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: owner,
    validation: v(z.object({ params: AiRecommendationIdParamSchema })),
    handler: asyncHandler(recommendations.discard),
  }),
);
