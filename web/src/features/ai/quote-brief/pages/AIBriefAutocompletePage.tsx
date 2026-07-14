'use client';

// Wrapper de la ruta `/organizer/events/[eventId]/ai/quote-brief` (US-021 / FE-002).
import { AIBriefAutocomplete } from '../components/AIBriefAutocomplete';

export function AIBriefAutocompletePage({ eventId }: { eventId: string }): React.JSX.Element {
  return <AIBriefAutocomplete eventId={eventId} />;
}
