import { EditEventPage } from '@/features/events';

// US-010 — edición de un evento propio (no terminal).
export default function OrganizerEditEventRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <EditEventPage eventId={params.eventId} />;
}
