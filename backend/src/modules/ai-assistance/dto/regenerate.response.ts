// US-026 (PB-P2-003 / BE-007) — Response DTO del endpoint de regeneración.
//
// Shape del contrato del tech spec §7 response 201:
//   { id, parent_recommendation_id, root_recommendation_id, recommendation_type,
//     regeneration_feedback, payload, locale, locale_fallback, created_at }
import type { RegenerateOutput } from '../application/regenerate/regenerate-ai-recommendation.use-case.js';

export interface RegenerateResponse {
  id: string;
  parent_recommendation_id: string;
  root_recommendation_id: string;
  recommendation_type: string;
  regeneration_feedback: string | null;
  payload: unknown;
  locale: string;
  locale_fallback: boolean;
  created_at: string;
}

export function toRegenerateResponse(out: RegenerateOutput): RegenerateResponse {
  return {
    id: out.view.id,
    parent_recommendation_id: out.parentRecommendationId,
    root_recommendation_id: out.rootRecommendationId,
    recommendation_type: out.view.type,
    regeneration_feedback: out.regenerationFeedback,
    payload: out.view.output,
    locale: out.view.locale,
    locale_fallback: out.view.localeFallback,
    created_at: out.view.createdAt,
  };
}
