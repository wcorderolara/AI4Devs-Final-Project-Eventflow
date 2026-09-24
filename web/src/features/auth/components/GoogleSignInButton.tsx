'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/design-system';

// Base same-origin del API (Next proxya `/api/v1` al backend). Igual que el httpClient del repo:
// el flujo OAuth es SERVER-DRIVEN → navegación directa (no fetch); el backend emite `state` y 302
// a Google. El navegador nunca maneja el `id_token` (SEC-05 / US-008 FE-001).
const API_PROXY = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? '/api/v1';

/** Logotipo "G" de Google (decorativo — el botón ya tiene label textual accesible). */
function GoogleIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * GoogleSignInButton (US-008 / FE-001). Inicia el flujo OAuth navegando al endpoint backend
 * `GET /api/v1/auth/google` (server-driven). Muestra un estado de redirección (spinner) mientras
 * el navegador se dirige a Google. Label textual accesible + icono decorativo (a11y). i18n en los
 * 4 locales (`auth.google.*`).
 */
export function GoogleSignInButton(): React.JSX.Element {
  const t = useTranslations('auth.google');
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = (): void => {
    setRedirecting(true);
    window.location.assign(`${API_PROXY}/auth/google`);
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      fullWidth
      leadingIcon={<GoogleIcon />}
      isLoading={redirecting}
      loadingLabel={t('loading')}
      onClick={handleClick}
    >
      {t('button')}
    </Button>
  );
}
