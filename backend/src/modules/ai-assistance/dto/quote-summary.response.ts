// Response DTO — POST /events/:eventId/ai/quote-summary (US-022 / BE-005, AC-01/AC-02/AC-04/AC-05).
// Estructura contractual del tech spec §7: `ai_recommendation_id`, `summaries`, `overall_observations`
// opcional, `locale`, `locale_fallback`, `generated_at`. Snake case por espejo del contrato AI cliente.
import type { AiRecommendationView } from '../domain/ai-recommendation.js';

export interface QuoteSummaryItem {
  quote_id: string;
  pros: string[];
  cons: string[];
  missing_info: string[];
  notes: string;
}

export interface QuoteSummaryResponse {
  ai_recommendation_id: string;
  summaries: QuoteSummaryItem[];
  overall_observations?: string;
  locale: string;
  locale_fallback: boolean;
  generated_at: string;
  quote_ids_snapshot: string[];
  category_code: string;
}

interface RawOutput {
  summaries?: QuoteSummaryItem[];
  overall_observations?: string;
}

interface RawInput {
  quote_ids_snapshot?: string[];
  category_code?: string;
}

/**
 * Construye la respuesta del endpoint a partir de la vista persistida. La estructura del `output`
 * ya fue validada por el motor genérico contra `OUTPUT_SCHEMAS.quote_compare_summary`, así que aquí
 * sólo se re-emiten los campos contractuales.
 */
export function toQuoteSummaryResponse(view: AiRecommendationView): QuoteSummaryResponse {
  const output = (view.output ?? {}) as RawOutput;
  const input = (view.input ?? {}) as RawInput;
  return {
    ai_recommendation_id: view.id,
    summaries: output.summaries ?? [],
    overall_observations: output.overall_observations,
    locale: view.locale,
    locale_fallback: view.localeFallback,
    generated_at: view.createdAt,
    quote_ids_snapshot: input.quote_ids_snapshot ?? [],
    category_code: input.category_code ?? '',
  };
}
