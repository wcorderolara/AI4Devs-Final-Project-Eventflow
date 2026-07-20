// US-074 (PB-P1-041 / FE-001): panel admin de moderación de VendorProfiles. Server Component
// que monta el shell client (`VendorModerationTable`) — el fetch y estado local viven en
// TanStack dentro del cliente. El filtro por defecto `status=pending` (Decisión PO D5) se
// pre-aplica en el propio componente antes del primer fetch.
import { VendorModerationTable } from '@/features/admin/vendors';

export default function AdminVendorsPage(): React.JSX.Element {
  return <VendorModerationTable />;
}
