import { AIChecklistGeneratorPage } from '@/features/ai/checklist';

// US-018 — generador de checklist IA por fases T-x para el evento del organizador.
export default function OrganizerAIChecklistRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <AIChecklistGeneratorPage eventId={params.eventId} />;
}
