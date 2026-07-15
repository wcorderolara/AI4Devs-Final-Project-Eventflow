// Controladores de ai-assistance (US-097 / BE-005). Delgados. `AIAssistanceController` mapea cada
// ruta a un feature del motor de generación; `AIRecommendationsController` maneja get/apply/discard.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { toGenerationResponse, toRecommendationDetail } from '../dto/index.js';
import type { AiBaseRequest, ApplyAiRecommendation, AiRecommendationIdParam } from '../dto/index.js';
import type { AiFeatureType } from '../domain/ai-features.js';
import type { GenerateAiRecommendationUseCase } from '../application/generate-ai-recommendation.use-case.js';
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
  constructor(private readonly generate: GenerateAiRecommendationUseCase) {}

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
