// Cliente API — AI Regenerate (US-026 / FE-002).
//   POST /api/v1/ai-recommendations/:id/regenerate — genera child AIRecommendation con feedback.
// Cross-cutting: sirve para cualquier `AIRecommendation` type (event_plan, checklist, budget,
// vendor_categories, quote_brief, quote_summary, task_priority, vendor_bio).
import { httpPost } from '@/shared/api-client';

export interface RegenerateAIRecommendationResponse {
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

export interface RegenerateAIRecommendationInput {
  recommendationId: string;
  feedback?: string;
  preferMock?: boolean;
}

interface RegenerateEnvelope {
  data: RegenerateAIRecommendationResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiRegenerateApi = {
  /**
   * US-026 / AC-01: regenera el `AIRecommendation` en el linaje del `recommendationId`.
   * Backend responde 201 con el child persistido — la UI debe invalidar las queries del
   * type original para reflejar el nuevo child.
   *
   * Timeout del cliente 65s (paridad US-022/US-024) para tolerar el cap 60s del provider IA.
   * El backend impone cap de 5 regeneraciones por linaje (AC-02 → 429 REGENERATION_LIMIT) y
   * rate limit shared (AC-07 → 429 RATE_LIMIT_EXCEEDED).
   */
  async regenerate(
    input: RegenerateAIRecommendationInput,
  ): Promise<RegenerateAIRecommendationResponse> {
    const envelope = await httpPost<
      RegenerateEnvelope,
      { feedback?: string; preferMock?: boolean }
    >(`/ai-recommendations/${input.recommendationId}/regenerate`, {
      body: { feedback: input.feedback, preferMock: input.preferMock },
      isAI: true,
      timeoutMs: 65_000,
    });
    return envelope.data;
  },
};
