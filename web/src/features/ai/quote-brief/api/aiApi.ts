// Cliente API de la feature AI Quote Brief (US-021 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/quote-brief. Auth por cookie HTTP-Only vía httpClient.
// El backend detecta PII del organizador en el output, valida invariantes y sirve fallback en demo.
import { httpPost } from '@/shared/api-client';

export interface QuoteBriefOutput {
  brief: string;
  requirements: string[];
  questions: string[];
  constraints: string[];
}

export interface QuoteBriefAiMeta {
  provider: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  languageCode?: string;
}

export interface GenerateQuoteBriefResponse {
  recommendationId: string;
  type: string;
  status: string;
  output: QuoteBriefOutput;
  aiMeta: QuoteBriefAiMeta;
  createdAt: string;
}

export interface QuoteBriefInput {
  service_category_code?: string;
  vendor_id?: string;
  event_type_code?: string;
  event_date?: string;
  guest_count?: number;
  budget_estimated?: number;
  currency_code?: string;
  city?: string;
  language_code?: string;
}

interface GenerateQuoteBriefRequest {
  input: QuoteBriefInput;
  languageCode?: string;
  preferMock?: boolean;
}

interface QuoteBriefEnvelope {
  data: GenerateQuoteBriefResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiQuoteBriefApi = {
  /** US-021 / AC-01: genera el brief estructurado IA. Timeout de cliente 65s (backend cap 60s). */
  async generate(
    eventId: string,
    body: GenerateQuoteBriefRequest,
  ): Promise<GenerateQuoteBriefResponse> {
    const dto = await httpPost<QuoteBriefEnvelope, GenerateQuoteBriefRequest>(
      `/events/${eventId}/ai/quote-brief`,
      { body, isAI: true, timeoutMs: 65_000 },
    );
    return dto.data;
  },
};
