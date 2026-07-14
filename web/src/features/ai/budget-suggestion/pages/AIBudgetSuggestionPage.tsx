'use client';

// Wrapper de la ruta `/organizer/events/[eventId]/ai/budget` (US-019 / FE-002).
import { AIBudgetSuggestion } from '../components/AIBudgetSuggestion';

export function AIBudgetSuggestionPage({ eventId }: { eventId: string }): React.JSX.Element {
  return <AIBudgetSuggestion eventId={eventId} />;
}
