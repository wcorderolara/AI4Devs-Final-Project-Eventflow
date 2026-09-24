import { LinkAccountConfirmation } from '@/features/auth';

/**
 * /auth/google/confirm-link (US-008 / FE-003, AC-03). Confirmación explícita de vinculación de la
 * cuenta Google a una cuenta email/password existente. El backend redirige aquí cuando el email ya
 * existe sin `google_sub`; solo tras confirmar se vincula y se emite sesión.
 */
export default function GoogleConfirmLinkPage(): React.JSX.Element {
  return <LinkAccountConfirmation />;
}
