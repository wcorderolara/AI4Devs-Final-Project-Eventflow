// Use cases de acciones sobre AIRecommendation (US-097 / BE-004, AI-003). AC-09/10/11.
// Ownership = requestedByUserId (masked 404). Apply → accepted SIN materializar dominio (HITL, N6);
// Discard → discarded. Transición inválida → INVALID_STATE_TRANSITION (422).
import type { AIRecommendationRepository } from '../ports/ai-recommendation.repository.js';
import type { DomainEventLogger } from '../../../shared/observability/domain-event-logger.js';
import type { AiRecommendationView } from '../domain/ai-recommendation.js';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error.js';
import { InvalidStateTransitionError } from '../../../shared/domain/errors/ai.errors.js';

async function loadOwned(
  repo: AIRecommendationRepository,
  id: string,
  userId: string,
): Promise<AiRecommendationView> {
  const rec = await repo.findById(id);
  if (!rec) throw new NotFoundError('Recommendation not found');
  if (rec.requestedByUserId !== userId) throw new NotFoundError('Not found');
  return rec;
}

export class GetAIRecommendationUseCase {
  constructor(private readonly repo: AIRecommendationRepository) {}
  execute(userId: string, id: string): Promise<AiRecommendationView> {
    return loadOwned(this.repo, id, userId);
  }
}

export class ApplyAIRecommendationUseCase {
  constructor(private readonly repo: AIRecommendationRepository, private readonly logger: DomainEventLogger) {}
  async execute(userId: string, id: string, correlationId?: string): Promise<AiRecommendationView> {
    const rec = await loadOwned(this.repo, id, userId);
    if (rec.status !== 'pending') throw new InvalidStateTransitionError('Recommendation is not pending');
    // HITL: la transición ES la acción humana; NO se materializa dominio desde el output (N6, AC-10).
    const view = await this.repo.markStatus(id, 'accepted');
    this.logger.emit('ai.recommendation.applied', { correlationId, actorId: userId, reason: id });
    return view;
  }
}

export class DiscardAIRecommendationUseCase {
  constructor(private readonly repo: AIRecommendationRepository, private readonly logger: DomainEventLogger) {}
  async execute(userId: string, id: string, correlationId?: string): Promise<void> {
    const rec = await loadOwned(this.repo, id, userId);
    if (rec.status !== 'pending') throw new InvalidStateTransitionError('Recommendation is not pending');
    await this.repo.markStatus(id, 'discarded');
    this.logger.emit('ai.recommendation.discarded', { correlationId, actorId: userId, reason: id });
  }
}
