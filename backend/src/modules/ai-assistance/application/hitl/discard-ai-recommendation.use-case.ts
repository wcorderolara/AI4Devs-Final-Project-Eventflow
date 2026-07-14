// US-025 (PB-P1-016 / BE-006) — `DiscardAIRecommendationUseCase`.
//   1. Carga la recomendación.
//   2. Ownership policy (admin excluido / no-revelación).
//   3. `markDiscarded` con `UPDATE ... WHERE status='pending'`.
//   4. Si `updatedCount=0` → 409.
//   5. Emite `ai.recommendation.discarded`. El body de la request se ignora (EC-08).
import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../../../infrastructure/prisma/client.js';
import type { AIRecommendationHITLRepository } from '../../ports/ai-recommendation-hitl.repository.js';
import type { AIRecommendationOwnershipPolicy, ActorContext } from './ownership.policy.js';
import { HitlLogger } from './hitl-logger.js';
import { RecommendationNotPendingError } from '../../domain/errors/hitl.errors.js';

export interface DiscardAIRecommendationInput {
  actor: ActorContext;
  recommendationId: string;
  correlationId?: string;
}

export class DiscardAIRecommendationUseCase {
  private readonly logger = new HitlLogger();
  constructor(
    private readonly repo: AIRecommendationHITLRepository,
    private readonly ownership: AIRecommendationOwnershipPolicy,
    private readonly prisma: PrismaClient = defaultPrisma,
  ) {}

  async execute(input: DiscardAIRecommendationInput): Promise<void> {
    const startedAt = Date.now();
    const rec = await this.repo.findById(input.recommendationId);
    this.ownership.assertOwnership({ recommendation: rec, actor: input.actor });
    const recommendation = rec!;
    const languageCode = (recommendation.aiMeta as { languageCode?: string } | null)?.languageCode;

    let updatedCount = 0;
    await this.prisma.$transaction(async (tx) => {
      const res = await this.repo.markDiscarded(tx, {
        id: recommendation.id,
        actorId: input.actor.id,
        correlationId: input.correlationId,
      });
      updatedCount = res.updatedCount;
      if (updatedCount === 0) throw new RecommendationNotPendingError();
    });

    this.logger.emit('ai.recommendation.discarded', {
      correlationId: input.correlationId,
      actorId: input.actor.id,
      type: recommendation.type,
      languageCode,
      recommendationId: recommendation.id,
      latencyMs: Date.now() - startedAt,
    });
  }
}
