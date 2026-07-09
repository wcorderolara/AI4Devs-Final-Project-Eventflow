// Puerto AIRecommendationRepository (US-097 / BE-002). Module-local.
import type { AiRecommendationView, CreateAiRecommendationData } from '../domain/ai-recommendation.js';

export interface AIRecommendationRepository {
  createPending(data: CreateAiRecommendationData): Promise<AiRecommendationView>;
  findById(id: string): Promise<AiRecommendationView | null>;
  markStatus(id: string, status: 'accepted' | 'discarded'): Promise<AiRecommendationView>;
}
