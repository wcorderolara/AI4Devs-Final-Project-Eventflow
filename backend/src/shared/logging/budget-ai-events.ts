// US-037 (PB-P1-021 / OBS-001) — Logger estructurado del apply de sugerencia IA de presupuesto.
// Sin PII: solo IDs, conteos, flags y correlationId. Consistente con el patrón HitlLogger de US-025.
import { logger } from '../infrastructure/logger/index.js';

export interface BudgetAiAppliedEvent {
  aiRecommendationId: string;
  eventId: string;
  budgetId: string;
  userId: string;
  acceptedEntriesCount: number;
  replacedItemsCount: number;
  createdItemsCount: number;
  edited: boolean;
  correlationId?: string;
  durationMs?: number;
}

export function emitBudgetAiSuggestionApplied(evt: BudgetAiAppliedEvent): void {
  logger.info(
    JSON.stringify({
      event: 'budget.ai_suggestion.applied',
      ...evt,
    }),
  );
}
