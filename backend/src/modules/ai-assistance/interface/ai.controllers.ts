// Controladores de ai-assistance (US-097 / BE-005). Delgados. `AIAssistanceController` mapea cada
// ruta a un feature del motor de generación; `AIRecommendationsController` maneja get/apply/discard.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import {
  toGenerationResponse,
  toRecommendationDetail,
  toQuoteSummaryResponse,
  toTaskPriorityResponse,
} from '../dto/index.js';
import type {
  AiBaseRequest,
  ApplyAiRecommendation,
  AiRecommendationIdParam,
  QuoteSummaryBody,
  LatestQuoteSummaryQuery,
} from '../dto/index.js';
import type { AiFeatureType } from '../domain/ai-features.js';
import type { GenerateAiRecommendationUseCase } from '../application/generate-ai-recommendation.use-case.js';
import type { GenerateQuoteSummaryUseCase } from '../application/generate-quote-summary.us022.use-case.js';
import type { GetLatestQuoteSummaryUseCase } from '../application/get-latest-quote-summary.us059.use-case.js';
import type { PrioritizeTasksUseCase } from '../application/prioritize-tasks.us024.use-case.js';
import type {
  GetAIRecommendationUseCase,
  DiscardAIRecommendationUseCase,
} from '../application/ai-recommendation-actions.use-cases.js';
import type { ApplyAIRecommendationUseCase as HitlApplyAIRecommendationUseCase } from '../application/hitl/apply-ai-recommendation.use-case.js';
import type { ActorContext } from '../application/hitl/ownership.policy.js';

function userId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}

function actorFromRequest(req: Request): ActorContext {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedError();
  const role = (req.user?.role ?? 'organizer') as ActorContext['role'];
  return { id, role };
}

export class AIAssistanceController {
  constructor(
    private readonly generate: GenerateAiRecommendationUseCase,
    // US-022 (PB-P2-001 / BE-005): use case dedicado con preflight (≥2 quotes, categoría existente,
    // snapshot). Delega al motor genérico para el ciclo auth+locale+validation+persist.
    private readonly generateQuoteSummary?: GenerateQuoteSummaryUseCase,
    // US-059 (PB-P2-001 / BE-004): fetch del último `AIRecommendation` `quote_compare_summary`
    // por (evento, category_code) para el surface del panel (5 estados en FE).
    private readonly getLatestQuoteSummary?: GetLatestQuoteSummaryUseCase,
    // US-024 (PB-P2-002 / BE-006): priorización IA top 3 con cache signature + snapshot HITL.
    private readonly prioritizeTasks?: PrioritizeTasksUseCase,
  ) {}

  /** Factory: handler para un feature, tomando el contexto del param indicado (o ninguno). */
  private handler(feature: AiFeatureType, contextParam?: 'eventId' | 'quoteRequestId') {
    return async (req: Request, res: Response): Promise<void> => {
      const body = req.validated?.body as AiBaseRequest;
      const params = (req.validated?.params ?? {}) as Record<string, string>;
      const contextId = contextParam ? params[contextParam] : undefined;
      const view = await this.generate.execute({
        userId: userId(req),
        feature,
        contextId,
        input: body.input,
        languageCode: body.languageCode,
        preferMock: body.preferMock,
        correlationId: req.correlationId,
      });
      res.status(200).json(success(toGenerationResponse(view), req.correlationId ?? ''));
    };
  }

  eventPlan = this.handler('event_plan', 'eventId');
  checklist = this.handler('checklist', 'eventId');
  budgetSuggestion = this.handler('budget_suggestion', 'eventId');
  vendorCategories = this.handler('vendor_categories', 'eventId');
  quoteBrief = this.handler('quote_brief', 'eventId');
  taskPrioritization = this.handler('task_prioritization', 'eventId');
  comparisonSummary = this.handler('quote_comparison', 'quoteRequestId');
  vendorBio = this.handler('vendor_bio');

  // US-022 (PB-P2-001 / BE-005): AI-006 event-scope con filtro por `category_code`. Distinto de
  // `comparisonSummary` (feature `quote_comparison`, quote_request-scope de US-097). Response
  // shape espejo del contrato del tech spec §7.
  quoteSummary = async (req: Request, res: Response): Promise<void> => {
    if (!this.generateQuoteSummary) throw new Error('GenerateQuoteSummaryUseCase not configured');
    const body = req.validated?.body as QuoteSummaryBody;
    const params = (req.validated?.params ?? {}) as { eventId: string };
    const view = await this.generateQuoteSummary.execute({
      userId: userId(req),
      eventId: params.eventId,
      categoryCode: body.category_code,
      preferMock: body.preferMock,
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toQuoteSummaryResponse(view), req.correlationId ?? ''));
  };

  // US-024 (PB-P2-002 / BE-006): AI task priority top 3 event-scope con cache signature + snapshot.
  // Distinto de `taskPrioritization` (feature `task_prioritization` con shape `prioritized[]` de
  // US-097). Response shape espejo del contrato del tech spec §7 (`top`, `cache_hit`, `locale`).
  taskPriority = async (req: Request, res: Response): Promise<void> => {
    if (!this.prioritizeTasks) throw new Error('PrioritizeTasksUseCase not configured');
    const params = (req.validated?.params ?? {}) as { eventId: string };
    const body = req.validated?.body as AiBaseRequest;
    const view = await this.prioritizeTasks.execute({
      userId: userId(req),
      eventId: params.eventId,
      preferMock: body.preferMock,
      correlationId: req.correlationId,
    });
    res.status(200).json(success(toTaskPriorityResponse(view), req.correlationId ?? ''));
  };

  // US-059 (PB-P2-001 / BE-004): surface del último `AIRecommendation` `quote_compare_summary`.
  // Devuelve el mismo shape del POST (US-022) para que el FE consuma `mutation.data` e
  // `initialData` con el mismo tipo `GenerateQuoteSummaryResponse` — 404 uniforme si no existe.
  latestQuoteSummary = async (req: Request, res: Response): Promise<void> => {
    if (!this.getLatestQuoteSummary) throw new Error('GetLatestQuoteSummaryUseCase not configured');
    const query = req.validated?.query as LatestQuoteSummaryQuery;
    const params = (req.validated?.params ?? {}) as { eventId: string };
    const view = await this.getLatestQuoteSummary.execute({
      userId: userId(req),
      eventId: params.eventId,
      categoryCode: query.category_code,
    });
    res.status(200).json(success(toQuoteSummaryResponse(view), req.correlationId ?? ''));
  };
}

export interface RecommendationUseCases {
  get: GetAIRecommendationUseCase;
  apply: HitlApplyAIRecommendationUseCase;
  discard: DiscardAIRecommendationUseCase;
}

export class AIRecommendationsController {
  constructor(private readonly uc: RecommendationUseCases) {}

  get = async (req: Request, res: Response): Promise<void> => {
    const { aiRecommendationId } = req.validated?.params as AiRecommendationIdParam;
    const view = await this.uc.get.execute(userId(req), aiRecommendationId);
    res.status(200).json(success(toRecommendationDetail(view), req.correlationId ?? ''));
  };

  apply = async (req: Request, res: Response): Promise<void> => {
    const { aiRecommendationId } = req.validated?.params as AiRecommendationIdParam;
    const body = req.validated?.body as ApplyAiRecommendation | undefined;
    // US-037 (EMERGENT-025-001): invoca el HITL apply real — valida editedOutput contra
    // OUTPUT_SCHEMAS.<type> y delega a la strategy registrada por type.
    const edited = body?.editedPayload ?? body?.editedOutput;
    const result = await this.uc.apply.execute({
      actor: actorFromRequest(req),
      recommendationId: aiRecommendationId,
      editedPayload: edited,
      correlationId: req.correlationId,
    });
    res
      .status(200)
      .json(success(toRecommendationDetail(result.recommendation), req.correlationId ?? ''));
  };

  discard = async (req: Request, res: Response): Promise<void> => {
    const { aiRecommendationId } = req.validated?.params as AiRecommendationIdParam;
    await this.uc.discard.execute(userId(req), aiRecommendationId, req.correlationId);
    res.status(204).end();
  };
}
