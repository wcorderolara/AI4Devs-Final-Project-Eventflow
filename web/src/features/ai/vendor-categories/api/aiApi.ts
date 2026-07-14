// Cliente API de la feature AI Vendor Categories (US-020 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/vendor-categories. Auth por cookie HTTP-Only vía httpClient.
// El backend filtra estrictamente contra `service_categories_active` y ordena por priority_score desc.
import { httpPost } from '@/shared/api-client';

export interface VendorCategory {
  service_category_code: string;
  name: string;
  priority_score: number;
  reason: string;
}

export interface VendorCategoriesOutput {
  categories: VendorCategory[];
}

export interface VendorCategoriesAiMeta {
  provider: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  languageCode?: string;
}

export interface GenerateVendorCategoriesResponse {
  recommendationId: string;
  type: string;
  status: string;
  output: VendorCategoriesOutput;
  aiMeta: VendorCategoriesAiMeta;
  createdAt: string;
}

export interface VendorCategoriesInput {
  event_type_code?: string;
  guest_count?: number;
  budget_estimated?: number;
  currency_code?: string;
  city?: string;
  language_code?: string;
  service_categories_active?: string[];
}

interface GenerateVendorCategoriesRequest {
  input: VendorCategoriesInput;
  languageCode?: string;
  preferMock?: boolean;
}

interface VendorCategoriesEnvelope {
  data: GenerateVendorCategoriesResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiVendorCategoriesApi = {
  /** US-020 / AC-01: genera la lista priorizada de categorías IA para el evento. Timeout de cliente 65s. */
  async generate(
    eventId: string,
    body: GenerateVendorCategoriesRequest,
  ): Promise<GenerateVendorCategoriesResponse> {
    const dto = await httpPost<VendorCategoriesEnvelope, GenerateVendorCategoriesRequest>(
      `/events/${eventId}/ai/vendor-categories`,
      { body, isAI: true, timeoutMs: 65_000 },
    );
    return dto.data;
  },
};
