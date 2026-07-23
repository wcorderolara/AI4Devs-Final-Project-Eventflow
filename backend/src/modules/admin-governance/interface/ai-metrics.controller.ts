// US-115 (PB-P2-012 / BE-005). Controlador `GET /api/v1/admin/ai-metrics`.
// Delgado: usa lo ya validado (`req.validated.query`), invoca el use case y
// serializa con el envelope canónico (`respond.success` — US-114).
//
// Emite log estructurado `admin.ai_metrics.viewed` (§14 Tech Spec) — reuso
// del logger US-113 con `correlationId` auto-inyectado; el redactor de PII
// del logger es responsable de scrubbing.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import { logger } from '../../../shared/infrastructure/logger/index.js';
import type { GetAIMetricsUseCase } from '../application/get-ai-metrics.use-case.js';
import type { AIMetricsQueryInput } from '../../../shared/validation/ai-metrics.query.schema.js';

export interface AIMetricsControllerDeps {
  getAIMetrics: GetAIMetricsUseCase;
}

export class AIMetricsController {
  constructor(private readonly deps: AIMetricsControllerDeps) {}

  getMetrics = async (req: Request, res: Response): Promise<void> => {
    const actorUserId = req.user?.id;
    if (!actorUserId) throw new UnauthorizedError();

    const query = req.validated?.query as AIMetricsQueryInput;

    const startedAt = Date.now();
    const metrics = await this.deps.getAIMetrics.execute({
      userId: actorUserId,
      window: query.window,
    });

    logger.info({
      event: 'admin.ai_metrics.viewed',
      actorUserId,
      correlationId: req.correlationId ?? null,
      window: query.window,
      latencyMs: Date.now() - startedAt,
    });

    res.status(200).json(success(metrics, req.correlationId ?? ''));
  };
}
