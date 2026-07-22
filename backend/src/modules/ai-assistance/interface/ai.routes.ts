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
  PrismaEventLanguageReader,
  PrismaVendorProfileReader,
  PrismaQuoteRequestEventReader,
  PrismaServiceCategoryReader,
} from '../../../infrastructure/readers/prisma-access-readers.js';
// US-022 (PB-P2-001 / BE-004): reader de Quotes existente reusado para preflight ≥2 elegibles.
import { PrismaQuoteRepository } from '../../quote-flow/infrastructure/prisma-quote.repository.js';
import { GenerateQuoteSummaryUseCase } from '../application/generate-quote-summary.us022.use-case.js';
// US-059 (PB-P2-001 / BE-002): use case de solo lectura para el surface del panel.
import { GetLatestQuoteSummaryUseCase } from '../application/get-latest-quote-summary.us059.use-case.js';
import { StructuredDomainEventLogger } from '../../../infrastructure/observability/structured-domain-event-logger.js';
import { PrismaAIRecommendationRepository } from '../infrastructure/prisma-ai-recommendation.repository.js';
import { PrismaAIRecommendationHitlRepository } from '../infrastructure/prisma-ai-recommendation-hitl.repository.js';
import { createLlmProvider } from '../infrastructure/llm-provider.factory.js';
import { AiGenerationService } from '../application/ai-generation.service.js';
import { GenerateAiRecommendationUseCase } from '../application/generate-ai-recommendation.use-case.js';
import {
  GetAIRecommendationUseCase,
  DiscardAIRecommendationUseCase,
} from '../application/ai-recommendation-actions.use-cases.js';
// US-037 (EMERGENT-025-001): cablear el HITL use case real, no el simplificado.
import { ApplyAIRecommendationUseCase as HitlApplyAIRecommendationUseCase } from '../application/hitl/apply-ai-recommendation.use-case.js';
import { AIRecommendationApplyStrategyRegistry } from '../application/hitl/apply-strategy.registry.js';
import { OutputDtoResolver } from '../application/hitl/output-dto.resolver.js';
import { AIRecommendationOwnershipPolicy } from '../application/hitl/ownership.policy.js';
import { MVP_APPLY_STRATEGIES } from '../application/hitl/strategies/index.js';
// US-037 strategy V2 con lógica D1..D6 completa; reemplaza la placeholder V1 del array MVP.
import { BudgetSuggestionApplyStrategyV2 } from '../../budget-management/application/hitl/budget-suggestion-apply.strategy.js';
import { PrismaBudgetItemWriteRepository } from '../../budget-management/infrastructure/prisma-budget-item-write.repository.js';
import { PrismaServiceCategoryReadAdapter } from '../../budget-management/infrastructure/prisma-service-category-read.adapter.js';
import {
  AiBaseRequestSchema,
  EventIdParamSchema,
  QuoteRequestIdParamSchema,
  AiRecommendationIdParamSchema,
  ApplyAiRecommendationSchema,
  QuoteSummaryBodySchema,
  LatestQuoteSummaryQuerySchema,
} from '../dto/index.js';
import { AIAssistanceController, AIRecommendationsController } from './ai.controllers.js';

const repo = new PrismaAIRecommendationRepository();
const hitlRepo = new PrismaAIRecommendationHitlRepository();
const logger = new StructuredDomainEventLogger();
const generationService = new AiGenerationService(createLlmProvider());
const generateUseCase = new GenerateAiRecommendationUseCase(
  repo,
  generationService,
  new PrismaEventAccessReader(),
  new PrismaVendorProfileReader(),
  new PrismaQuoteRequestEventReader(),
  logger,
  // US-082 D5 / AC-05: reader del `event.languageCode` para pasar `locale = event.languageCode`
  // al provider IA en features event-scoped y quote-request-scoped.
  new PrismaEventLanguageReader(),
);
// US-022 (PB-P2-001 / BE-005): composición del use case dedicado del comparador de Quotes.
const generateQuoteSummaryUseCase = new GenerateQuoteSummaryUseCase(
  new PrismaEventAccessReader(),
  new PrismaServiceCategoryReader(),
  new PrismaQuoteRepository(),
  generateUseCase,
);
// US-059 (PB-P2-001 / BE-002): fetch del último resumen para el surface del panel (5 estados FE).
const getLatestQuoteSummaryUseCase = new GetLatestQuoteSummaryUseCase(
  repo,
  new PrismaEventAccessReader(),
);
const assistance = new AIAssistanceController(
  generateUseCase,
  generateQuoteSummaryUseCase,
  getLatestQuoteSummaryUseCase,
);

// US-025 HITL registry — se sustituye la strategy `budget_suggestion` placeholder por la V2 de US-037.
const budgetSuggestionV2 = new BudgetSuggestionApplyStrategyV2({
  budgetItemWriteRepo: new PrismaBudgetItemWriteRepository(),
  serviceCategoryReadPort: new PrismaServiceCategoryReadAdapter(),
});
const mvpStrategiesWithBudgetV2 = MVP_APPLY_STRATEGIES.filter((s) => s.type !== 'budget_suggestion');
const applyStrategyRegistry = new AIRecommendationApplyStrategyRegistry([
  ...mvpStrategiesWithBudgetV2,
  budgetSuggestionV2,
]);
const hitlApplyUseCase = new HitlApplyAIRecommendationUseCase(
  hitlRepo,
  applyStrategyRegistry,
  new OutputDtoResolver(),
  new AIRecommendationOwnershipPolicy(),
);
const recommendations = new AIRecommendationsController({
  get: new GetAIRecommendationUseCase(repo),
  apply: hitlApplyUseCase,
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

// ── US-022 (PB-P2-001 / BE-005): resumen IA del comparador event-scope con `category_code`.
// AI-006 con HITL informativo, locale binding (US-084) y rate limit shared (US-110). Distinto
// del endpoint anterior (`quote_comparison` scope quote_request).
aiAssistanceRouter.post(
  '/events/:eventId/ai/quote-summary',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: organizer,
    rateLimit: aiGenerationRateLimit,
    validation: v(z.object({ params: EventIdParamSchema, body: QuoteSummaryBodySchema })),
    handler: asyncHandler(assistance.quoteSummary),
  }),
);

// ── US-059 (PB-P2-001 / BE-004): surface del último `AIRecommendation` `quote_compare_summary`.
// Solo lectura (sin rate limit AI): cadena `auth → organizer → validation`. 404 uniforme si no
// existe → el FE lo interpreta como "empty state + CTA" (AC-02). El endpoint by-id se reusa de
// US-097 (`GET /ai-recommendations/:aiRecommendationId`, ya montado abajo).
aiAssistanceRouter.get(
  '/events/:eventId/ai/quote-summary',
  ...composeProtectedRoute({
    auth: sessionAuth,
    role: organizer,
    validation: v(
      z.object({ params: EventIdParamSchema, query: LatestQuoteSummaryQuerySchema }),
    ),
    handler: asyncHandler(assistance.latestQuoteSummary),
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
