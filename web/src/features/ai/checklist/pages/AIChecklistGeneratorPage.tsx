'use client';

// Wrapper de la ruta `/organizer/events/[eventId]/ai/checklist` (US-018 / FE-002).
import { AIChecklistGenerator } from '../components/AIChecklistGenerator';

export function AIChecklistGeneratorPage({ eventId }: { eventId: string }): React.JSX.Element {
  return <AIChecklistGenerator eventId={eventId} />;
}
