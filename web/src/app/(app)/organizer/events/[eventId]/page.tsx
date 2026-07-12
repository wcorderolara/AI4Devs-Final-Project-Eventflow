import { EventDashboardPage } from '@/features/events';

// US-014 — dashboard/detalle de un evento propio.
export default function OrganizerEventDashboardRoute({
  params,
}: {
  params: { eventId: string };
}) {
  return <EventDashboardPage eventId={params.eventId} />;
}
