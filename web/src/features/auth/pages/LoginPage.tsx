import { useTranslations } from 'next-intl';
import { LoginForm } from '../components/LoginForm';

/**
 * Composición de /login (US-003 / FE-001). `from` llega del middleware de rutas protegidas
 * (US-105) y se valida como ruta interna antes de usarse en la redirección post-login.
 * `showResetSuccess` (US-004 / AC-02): aviso i18n tras restablecer la contraseña.
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
        <p role="status" aria-live="polite" className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          {t('resetSuccess')}
        </p>
      ) : null}
      <LoginForm from={from} />
    </div>
  );
}
