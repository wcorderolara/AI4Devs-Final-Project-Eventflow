import { AIBriefAutocompletePage } from '@/features/ai/quote-brief';

// US-021 — brief IA autocompletado para `QuoteRequest` (handoff a US-023 al enviar).
export default function OrganizerAIQuoteBriefRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <AIBriefAutocompletePage eventId={params.eventId} />;
}
