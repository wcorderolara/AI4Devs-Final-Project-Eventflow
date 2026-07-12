import { RegisterOrganizerForm } from '../components/RegisterOrganizerForm';
import { RegisterVendorForm } from '../components/RegisterVendorForm';

/**
 * Composición de /register (US-001 / FE-001 + US-002 / FE-001). El query `role` decide la
 * variante: `vendor` → RegisterVendorForm; cualquier otro valor/ausente → organizer (default).
 * (El prop se llama `roleParam` para no colisionar con el atributo ARIA `role` — jsx-a11y.)
 */
export function RegisterPage({ roleParam }: { roleParam?: string }): React.JSX.Element {
  if (roleParam === 'vendor') return <RegisterVendorForm />;
  return <RegisterOrganizerForm />;
}
