// Cliente API de la feature AI Budget Suggestion (US-019 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/budget-suggestion. Auth por cookie HTTP-Only vía httpClient.
// Backend calcula `amount` por categoría a partir de `budget_estimated` (US-019 BE-003).
import { httpPost } from '@/shared/api-client';

export interface BudgetSuggestionCategory {
  name: string;
  service_category_code: string;
  percentage: number;
  amount: number;
  notes?: string;
}

export interface BudgetSuggestionOutput {
  currency_code: string;
  budget_estimated: number;
  categories: BudgetSuggestionCategory[];
}

export interface BudgetSuggestionAiMeta {
  provider: string;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  languageCode?: string;
}

export interface GenerateBudgetSuggestionResponse {
  recommendationId: string;
  type: string;
  status: string;
  output: BudgetSuggestionOutput;
  aiMeta: BudgetSuggestionAiMeta;
  createdAt: string;
}

export interface BudgetSuggestionInput {
  eventTypeCode?: string;
  guest_count?: number;
  budget_estimated: number;
  currency_code: string;
  city?: string;
  language_code?: string;
  service_categories_active?: string[];
}

interface GenerateBudgetSuggestionRequest {
  input: BudgetSuggestionInput;
  languageCode?: string;
  preferMock?: boolean;
}

interface BudgetSuggestionEnvelope {
  data: GenerateBudgetSuggestionResponse;
  meta: { correlationId: string; timestamp: string };
}

export const aiBudgetSuggestionApi = {
  /** US-019 / AC-01: genera la distribución IA de presupuesto para un evento. Timeout de cliente 65s. */
  async generate(
    eventId: string,
    body: GenerateBudgetSuggestionRequest,
  ): Promise<GenerateBudgetSuggestionResponse> {
    const dto = await httpPost<BudgetSuggestionEnvelope, GenerateBudgetSuggestionRequest>(
      `/events/${eventId}/ai/budget-suggestion`,
      { body, isAI: true, timeoutMs: 65_000 },
    );
    return dto.data;
  },
};
