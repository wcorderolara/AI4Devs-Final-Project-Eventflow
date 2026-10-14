// Cliente API de la feature AI Budget Suggestion (US-019 / FE-001).
// Contrato: POST /api/v1/events/:eventId/ai/budget-suggestion. Auth por cookie HTTP-Only vía httpClient.
// Backend calcula `amount` por categoría a partir de `budget_estimated` (US-019 BE-003).
import {
  createAIGenerator,
  type AIGenerationResponse,
} from '@/features/ai/shared/api/createAIGenerator';

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

export type GenerateBudgetSuggestionResponse = AIGenerationResponse<BudgetSuggestionOutput>;

export interface BudgetSuggestionInput {
  eventTypeCode?: string;
  guest_count?: number;
  budget_estimated: number;
  currency_code: string;
  city?: string;
  language_code?: string;
  service_categories_active?: string[];
}

/** US-019 / AC-01: genera la distribución IA de presupuesto para un evento. Timeout de cliente 65s. */
export const aiBudgetSuggestionApi = createAIGenerator<
  BudgetSuggestionInput,
  BudgetSuggestionOutput
>('budget-suggestion');
