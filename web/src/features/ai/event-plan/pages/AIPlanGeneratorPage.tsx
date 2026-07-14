'use client';

// Wrapper de la ruta `/organizer/events/[eventId]/ai/plan` (US-017 / FE-002).
import { AIPlanGenerator } from '../components/AIPlanGenerator';

export function AIPlanGeneratorPage({ eventId }: { eventId: string }): React.JSX.Element {
  return <AIPlanGenerator eventId={eventId} />;
}
