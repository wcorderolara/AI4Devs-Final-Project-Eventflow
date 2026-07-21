// US-080 (PB-P1-046) / FE-001 — Visor admin del audit log AdminAction. Server Component
// que monta el shell client (`AdminActionsPanel`); el fetch y estado local viven en TanStack
// dentro del cliente.
import { AdminActionsPanel } from '@/features/admin/admin-actions';

export default function AdminActionsPage(): React.JSX.Element {
  return <AdminActionsPanel />;
}
