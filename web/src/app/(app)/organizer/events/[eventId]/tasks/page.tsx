// US-027 (PB-P1-018 / FE-004) — Ruta Next.js del checklist del evento.
// Renderiza el contenedor cliente `EventChecklistPage` (que es "use client"). El status del
// evento se obtiene lazily; para la vista solo se necesita `eventId` — el read-only/bloqueado
// se resuelve dentro del contenedor cuando reciba `eventStatus`.
import { EventChecklistPage } from '@/features/tasks/list';

interface Props {
  params: { eventId: string };
}

export default function OrganizerEventTasksPage({ params }: Props): JSX.Element {
  return <EventChecklistPage eventId={params.eventId} />;
}
