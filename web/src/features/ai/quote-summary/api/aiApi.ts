// Cliente API — AI Quote Comparison Summary.
//   POST /api/v1/events/:eventId/ai/quote-summary (US-022 / FE-003) — genera el resumen.
//   GET  /api/v1/events/:eventId/ai/quote-summary?category_code= (US-059 / BE-004) — surface del último.
// Ambos endpoints devuelven el mismo shape para que la UI use un tipo único.
import { httpGetData, httpPostData } from '@/shared/api-client';

export interface QuoteSummaryItem {
  quote_id: string;
  pros: string[];
  cons: string[];
  missing_info: string[];
  notes: string;
}

export interface GenerateQuoteSummaryResponse {
  ai_recommendation_id: string;
  summaries: QuoteSummaryItem[];
  overall_observations?: string;
  locale: string;
  locale_fallback: boolean;
  generated_at: string;
  quote_ids_snapshot: string[];
  category_code: string;
}

export interface GenerateQuoteSummaryInput {
  eventId: string;
  categoryCode: string;
  preferMock?: boolean;
}

export interface LatestQuoteSummaryInput {
  eventId: string;
  categoryCode: string;
}

export const aiQuoteSummaryApi = {
  /**
   * US-022 / AC-01: genera el resumen IA para el comparador de Quotes. Timeout del cliente 65s
   * para tolerar el cap 60s del provider AI (US-123) + margen de red.
   */
  async generate(input: GenerateQuoteSummaryInput): Promise<GenerateQuoteSummaryResponse> {
    return httpPostData<
      GenerateQuoteSummaryResponse,
      { category_code: string; preferMock?: boolean }
    >(`/events/${input.eventId}/ai/quote-summary`, {
      body: { category_code: input.categoryCode, preferMock: input.preferMock },
      isAI: true,
      timeoutMs: 65_000,
    });
  },

  /**
   * US-059 / AC-01: surface del último `AIRecommendation` `quote_compare_summary` persistido
   * para el par (evento, categoría). 404 uniforme si no existe — el hook lo interpreta como
   * "empty state + CTA" en la UI (AC-02).
   */
  async getLatest(input: LatestQuoteSummaryInput): Promise<GenerateQuoteSummaryResponse> {
    return httpGetData<GenerateQuoteSummaryResponse>(
      `/events/${input.eventId}/ai/quote-summary?category_code=${encodeURIComponent(input.categoryCode)}`,
    );
  },
};
