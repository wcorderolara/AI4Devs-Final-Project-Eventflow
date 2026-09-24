'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert, Button } from '@/shared/design-system';
import { useCompleteGoogleSignup } from '../hooks/useGoogleOAuth';

type Role = 'organizer' | 'vendor';

/**
 * RoleSelectorOnSignup (US-008 / FE-002, AC-02, VR-03). Pantalla intermedia del primer signup
 * OAuth: el usuario elige `organizer`/`vendor` y se envía al endpoint de completar signup. Sin
 * selección de rol NO se puede continuar (VR-03). Accesible: `radiogroup` con `fieldset/legend`,
 * radios nativos con foco visible; el estado de error se comunica con texto + icono (`Alert`),
 * nunca solo por color. i18n en 4 locales (`auth.google.selectRole.*`).
 */
export function RoleSelectorOnSignup(): React.JSX.Element {
  const t = useTranslations('auth.google.selectRole');
  const mutation = useCompleteGoogleSignup();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options: Array<{ value: Role; label: string; hint: string }> = [
    { value: 'organizer', label: t('organizer'), hint: t('organizerHint') },
    { value: 'vendor', label: t('vendor'), hint: t('vendorHint') },
  ];

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (mutation.isPending) return;
    if (!role) {
      setError(t('required'));
      return;
    }
    setError(null);
    mutation.mutate(role, { onError: () => setError(t('error')) });
  };

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={mutation.isPending}>
      <h1 className="font-heading text-h2 font-semibold text-primary">{t('title')}</h1>
      <p className="mt-2 font-body text-body-md text-secondary">{t('subtitle')}</p>

      {error ? (
        <Alert variant="error" live className="mt-6">
          {error}
        </Alert>
      ) : null}

      <fieldset className="mt-6 flex flex-col gap-3">
        <legend className="sr-only">{t('title')}</legend>
        {options.map((opt) => (
          <div
            key={opt.value}
            className="flex items-start gap-3 rounded-lg border border-subtle p-4 hover:bg-action-ghost-hover focus-within:ring-2 focus-within:ring-action-primary"
          >
            <input
              id={`oauth-role-${opt.value}`}
              type="radio"
              name="oauth-role"
              value={opt.value}
              checked={role === opt.value}
              onChange={() => {
                setRole(opt.value);
                setError(null);
              }}
              className="mt-1 h-4 w-4"
            />
            <label htmlFor={`oauth-role-${opt.value}`} className="flex cursor-pointer flex-col">
              <span className="font-body text-body-md font-semibold text-primary">{opt.label}</span>
              <span className="font-body text-body-sm text-secondary">{opt.hint}</span>
            </label>
          </div>
        ))}
      </fieldset>

      <Button
        type="submit"
        size="lg"
        fullWidth
        isLoading={mutation.isPending}
        loadingLabel={t('submitting')}
        className="mt-6"
      >
        {t('submit')}
      </Button>
    </form>
  );
}
