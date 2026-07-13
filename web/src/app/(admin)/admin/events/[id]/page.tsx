import { AdminEventDetailPage } from '@/features/admin/events/pages/AdminEventDetailPage';

// US-016 — Vista admin solo lectura del detalle de un evento (auditada por backend).
export default function AdminEventDetailRoute({ params }: { params: { id: string } }) {
  return <AdminEventDetailPage eventId={params.id} />;
}
