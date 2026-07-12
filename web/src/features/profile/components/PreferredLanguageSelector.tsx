'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useState } from 'react';
import { ApiError } from '@/shared/api-client';
import { localeLabels } from '@/shared/i18n';
import type { PreferredLanguage } from '../api/profileApi.types';
import { useUpdatePreferredLanguage } from '../hooks/useUpdatePreferredLanguage';
import { PREFERRED_LANGUAGES } from '../schemas/profileSchema';

/**
 * PreferredLanguageSelector (US-007 / AC-01/AC-02). `<select>` nativo accesible con nombres
 * NATIVOS de cada idioma (`Español (LATAM)`, `English`, ...). Al cambiar, persiste el idioma en
 * el backend y lo aplica de inmediato en la UI (cookie + `router.refresh()` en el hook).
 */
export function PreferredLanguageSelector({
  current,
}: {
  current: PreferredLanguage;
}): React.JSX.Element {
  const t = useTranslations('profile');
  const mutation = useUpdatePreferredLanguage();
  const [error, setError] = useState<string | null>(null);

  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value as PreferredLanguage;
    if (next === current) return;
    setError(null);
    mutation.mutate(next, {
      onError: (err) => {
        const code = err instanceof ApiError && err.code === 'UNSUPPORTED_LANGUAGE' ? 'UNSUPPORTED_LANGUAGE' : 'UNEXPECTED';
        setError(t(`errors.${code}`));
      },
    });
  };

  return (
    <div>
      <h2 className="text-lg font-semibold">{t('language.title')}</h2>
      <p className="mt-1 text-sm text-neutral-600">{t('language.description')}</p>

      <label htmlFor="preferred-language" className="mt-3 block text-sm font-medium">
        {t('language.label')}
      </label>
      <select
        id="preferred-language"
        value={current}
        onChange={onChange}
        disabled={mutation.isPending}
        aria-describedby={mutation.isPending ? 'preferred-language-status' : undefined}
        className="mt-1 rounded border border-neutral-300 px-3 py-2 disabled:opacity-50"
      >
        {PREFERRED_LANGUAGES.map((option) => (
          <option key={option} value={option}>
            {localeLabels[option]}
          </option>
        ))}
      </select>

      {mutation.isPending ? (
        <p id="preferred-language-status" role="status" aria-live="polite" className="mt-2 text-sm text-neutral-600">
          {t('language.applying')}
        </p>
      ) : null}
      {error ? (
        <p role="alert" aria-live="polite" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
