// US-075 (PB-P1-042 / FE-001): shell del panel admin del catálogo `ServiceCategory`.
// Server Component mínimo que monta el orquestador cliente (`CategoriesPanel`) — el
// fetch, mutations y estado local viven en TanStack dentro del cliente (paridad con
// `admin/vendors/page.tsx` y `admin/reviews/page.tsx`).
import { CategoriesPanel } from '@/features/admin/categories';

export default function AdminCategoriesPage(): React.JSX.Element {
  return <CategoriesPanel />;
}
