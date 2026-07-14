import { AIPlanGeneratorPage } from '@/features/ai/event-plan';

// US-017 — generador de plan IA para el evento del organizador.
export default function OrganizerAIPlanRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <AIPlanGeneratorPage eventId={params.eventId} />;
}
