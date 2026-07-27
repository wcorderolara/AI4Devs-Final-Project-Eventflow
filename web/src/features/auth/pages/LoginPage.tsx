import { useTranslations } from 'next-intl';
import { Alert } from '@/shared/design-system';
import { LoginForm } from '../components/LoginForm';

/**
 * Composición de /login (US-003 / FE-001). Server Component: sólo `LoginForm` es cliente.
 *
 * `from` llega del middleware de rutas protegidas (US-105) y se valida como ruta interna antes de
 * usarse en la redirección post-login. `showResetSuccess` (US-004 / AC-02): aviso i18n tras
 * restablecer la contraseña — ahora con `Alert` del design system (`role="status"`, icono + texto)
 * en lugar de la caja verde con utilidades de paleta cruda.
 *
 * La redirección de un usuario **ya autenticado** fuera de `/login` no se resuelve aquí: la aplica
 * `roleGuardMiddleware` en el edge, antes de renderizar (US-105 AC-08).
 */
export function LoginPage({
  from,
  showResetSuccess = false,
}: {
  from?: string | null;
  showResetSuccess?: boolean;
}): React.JSX.Element {
  const t = useTranslations('auth.login');
  return (
    <div>
      {showResetSuccess ? (
        <Alert variant="success" live className="mb-6">
          {t('resetSuccess')}
        </Alert>
      ) : null}
      <LoginForm from={from} />
    </div>
  );
}
