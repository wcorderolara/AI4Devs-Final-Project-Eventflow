import { AIBudgetSuggestionPage } from '@/features/ai/budget-suggestion';

// US-019 — sugerencia IA de distribución de presupuesto por categoría para el evento.
export default function OrganizerAIBudgetRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <AIBudgetSuggestionPage eventId={params.eventId} />;
}
