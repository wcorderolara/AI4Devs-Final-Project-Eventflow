'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  LanguageSelector as LanguageSelectorView,
  type LanguageOption,
} from '@/shared/design-system';
import { locales, localeLabels, type Locale } from './config';
import { useLocaleSwitcher } from './useLocaleSwitcher';

/**
 * `LanguageSelector` global (US-081 / AC-05).
 *
 * PB-P2-029: la presentación pasa a `LanguageSelector` del design system (Listbox de HeadlessUI
 * con `role="listbox"` / `role="option"` + `aria-selected` y navegación por teclado). **El
 * comportamiento `next-intl` no cambia**: el locale, el cambio optimista, el rollback y la
 * persistencia siguen viviendo en `useLocaleSwitcher`. Los `data-testid` previos se conservan.
 */
export function LanguageSelector(): React.JSX.Element {
  const t = useTranslations('common');
  const { currentLocale, switchLocale, isPending, error, clearError } = useLocaleSwitcher();

  const options = useMemo<LanguageOption[]>(
    () => locales.map((code) => ({ value: code, label: localeLabels[code], short: code })),
    [],
  );

  return (
    <LanguageSelectorView
      label={t('languageSelector.label')}
      value={currentLocale}
      options={options}
      onChange={(next) => switchLocale(next as Locale)}
      isPending={isPending}
      error={
        error === 'SAVE_FAILED' ? (
          <p
            role="alert"
            aria-live="polite"
            data-testid="language-selector-error"
            className="absolute right-0 top-full mt-1 w-64 rounded-card border border-feedback-error bg-feedback-error px-2 py-1 font-body text-caption text-feedback-error"
          >
            {t('languageSelector.error')}
            <button
              type="button"
              onClick={clearError}
              className="focus-ring ml-2 rounded-sm underline"
              aria-label={t('languageSelector.dismiss')}
            >
              {t('languageSelector.dismiss')}
            </button>
          </p>
        ) : null
      }
    />
  );
}
