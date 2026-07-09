// Response DTOs de AIRecommendation (US-097 / BE-001). AC-01..AC-12.
import type { AiRecommendationView } from '../domain/ai-recommendation.js';

export interface GenerationResponse {
  recommendationId: string;
  type: string;
  status: string;
  output: unknown;
  aiMeta: unknown;
  createdAt: string;
}
export function toGenerationResponse(v: AiRecommendationView): GenerationResponse {
  return { recommendationId: v.id, type: v.type, status: v.status, output: v.output, aiMeta: v.aiMeta, createdAt: v.createdAt };
}

export interface RecommendationDetailResponse {
  recommendationId: string;
  type: string;
  status: string;
  eventId: string | null;
  vendorProfileId: string | null;
  quoteRequestId: string | null;
  input: unknown;
  output: unknown;
  aiMeta: unknown;
  createdAt: string;
}
export function toRecommendationDetail(v: AiRecommendationView): RecommendationDetailResponse {
  return {
    recommendationId: v.id,
    type: v.type,
    status: v.status,
    eventId: v.eventId,
    vendorProfileId: v.vendorProfileId,
    quoteRequestId: v.quoteRequestId,
    input: v.input,
    output: v.output,
    aiMeta: v.aiMeta,
    createdAt: v.createdAt,
  };
}
