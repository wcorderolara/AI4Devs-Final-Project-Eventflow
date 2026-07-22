// Cliente API — AI Quote Comparison Summary (US-022 / PB-P2-001 / FE-003).
// Contrato: `POST /api/v1/events/:eventId/ai/quote-summary` con body `{category_code, preferMock?}`.
// Response espejo del tech spec §7:
//   { ai_recommendation_id, summaries[], overall_observations?, locale, locale_fallback,
//     generated_at, quote_ids_snapshot, category_code }
import { httpPost } from '@/shared/api-client';

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

interface QuoteSummaryEnvelope {
  data: GenerateQuoteSummaryResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiQuoteSummaryApi = {
  /**
   * US-022 / AC-01: genera el resumen IA para el comparador de Quotes. Timeout del cliente 65s
   * para tolerar el cap 60s del provider AI (US-123) + margen de red.
   */
  async generate(input: GenerateQuoteSummaryInput): Promise<GenerateQuoteSummaryResponse> {
    const envelope = await httpPost<
      QuoteSummaryEnvelope,
      { category_code: string; preferMock?: boolean }
    >(`/events/${input.eventId}/ai/quote-summary`, {
      body: { category_code: input.categoryCode, preferMock: input.preferMock },
      isAI: true,
      timeoutMs: 65_000,
    });
    return envelope.data;
  },
};
