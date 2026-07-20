// US-076 (PB-P1-043 / FE-001): shell del panel admin del catálogo `EventType`.
// Server Component mínimo que monta el orquestador cliente (`EventTypesPanel`) — el
// fetch, mutations y estado local viven en TanStack dentro del cliente (paridad con
// `admin/categories/page.tsx` de US-075).
import { EventTypesPanel } from '@/features/admin/event-types';

export default function AdminEventTypesPage(): React.JSX.Element {
  return <EventTypesPanel />;
}
