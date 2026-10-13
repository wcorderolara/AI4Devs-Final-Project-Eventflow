// Cliente API de la feature AI Quote Brief (US-021 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/quote-brief. Auth por cookie HTTP-Only vía httpClient.
// El backend detecta PII del organizador en el output, valida invariantes y sirve fallback en demo.
import {
  createAIGenerator,
  type AIGenerationResponse,
} from '@/features/ai/shared/api/createAIGenerator';

export interface QuoteBriefOutput {
  brief: string;
  requirements: string[];
  questions: string[];
  constraints: string[];
}

export type GenerateQuoteBriefResponse = AIGenerationResponse<QuoteBriefOutput>;

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

/** US-021 / AC-01: genera el brief estructurado IA. Timeout de cliente 65s (backend cap 60s). */
export const aiQuoteBriefApi = createAIGenerator<QuoteBriefInput, QuoteBriefOutput>('quote-brief');
