// US-078 (PB-P1-044) / FE-001 — Panel admin de eventos (listado sólo lectura). Server Component
// que monta el shell client (`AdminEventsPanel`); el fetch y estado local viven en TanStack
// dentro del cliente.
import { AdminEventsPanel } from '@/features/admin/events';

export default function AdminEventsPage(): React.JSX.Element {
  return <AdminEventsPanel />;
}
