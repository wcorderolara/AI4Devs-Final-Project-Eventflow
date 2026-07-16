// Página `/organizer/vendors` (US-045 / FE-001).
// Renderiza el directorio autenticado. El estado de filtros vive en la URL (`useSearchParams`)
// para deep linking y compartir búsquedas.
import { VendorSearch } from '@/features/vendor-directory';

export default function OrganizerVendorsPage(): JSX.Element {
  return <VendorSearch />;
}
