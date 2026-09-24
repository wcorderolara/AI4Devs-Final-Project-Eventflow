'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button } from '@/shared/design-system';
import { useConfirmGoogleLink } from '../hooks/useGoogleOAuth';

/**
 * LinkAccountConfirmation (US-008 / FE-003, AC-03). Confirmación EXPLÍCITA para vincular la cuenta
 * de Google a una cuenta email/password existente. Solo tras confirmar se vincula `google_sub` y
 * se emite sesión. Si el usuario cancela, no se vincula y vuelve a `/login` (sesión anónima — AC-03).
 * i18n en 4 locales (`auth.google.link.*`).
 */
export function LinkAccountConfirmation(): React.JSX.Element {
  const t = useTranslations('auth.google.link');
  const router = useRouter();
  const mutation = useConfirmGoogleLink();
  const [error, setError] = useState<string | null>(null);

  const onConfirm = (): void => {
    if (mutation.isPending) return;
    setError(null);
    mutation.mutate(undefined, { onError: () => setError(t('error')) });
  };

  const onCancel = (): void => {
    // AC-03: cancelar no vincula y no crea sesión — se vuelve al login (sesión anónima).
    router.push('/login');
  };

  return (
    <div aria-busy={mutation.isPending}>
      <h1 className="font-heading text-h2 font-semibold text-primary">{t('title')}</h1>
      <p className="mt-2 font-body text-body-md text-secondary">{t('description')}</p>

      {error ? (
        <Alert variant="error" live className="mt-6">
          {error}
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          size="lg"
          fullWidth
          isLoading={mutation.isPending}
          loadingLabel={t('confirming')}
          onClick={onConfirm}
        >
          {t('confirm')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
