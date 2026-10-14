// US-025 (PB-P1-016 / FE-001) — Cliente API HITL. Dos endpoints canónicos:
// `POST /api/v1/ai-recommendations/:id/apply` (200 con `editedPayload?`) y `POST /discard` (204).
// Auth por cookie HTTP-Only vía httpClient compartido.
import { httpPost, httpPostData, type Envelope } from '@/shared/api-client';

export interface AIRecommendationResponseDto {
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

export interface ApplyBody {
  editedPayload?: Record<string, unknown>;
}

export const hitlApi = {
  /** US-025 AC-01/02: aplicar (200) con o sin edición. */
  async applyRecommendation(
    aiRecommendationId: string,
    body: ApplyBody = {},
  ): Promise<AIRecommendationResponseDto> {
    return httpPostData<AIRecommendationResponseDto, ApplyBody>(
      `/ai-recommendations/${aiRecommendationId}/apply`,
      { body, timeoutMs: 30_000 },
    );
  },

  /** US-025 AC-03: descartar (204 — el cliente reconstruye una view mínima local). */
  async discardRecommendation(aiRecommendationId: string): Promise<void> {
    await httpPost<Envelope<unknown>, Record<string, never>>(
      `/ai-recommendations/${aiRecommendationId}/discard`,
      { body: {}, timeoutMs: 30_000 },
    );
  },
};
