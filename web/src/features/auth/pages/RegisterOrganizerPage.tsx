import { RegisterOrganizerForm } from '../components/RegisterOrganizerForm';

/**
 * Composición de la página de registro (US-001 / FE-001). Ruta real: `/register` (route group
 * `(auth)`) — sin prefijo de locale en la URL (conventions §10.10; nota N2 del execution record).
 * El query `?role=organizer` es el default; `role=vendor` se atiende en US-002.
 */
export function RegisterOrganizerPage(): React.JSX.Element {
  return <RegisterOrganizerForm />;
}
