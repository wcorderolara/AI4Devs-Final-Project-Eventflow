'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { localeLabels, type Locale } from './config';
import { useLocale } from './useLocale';

/**
 * Selector de idioma accesible (WCAG 2.1 AA). Usa un `<select>` nativo: focusable, navegable por
 * teclado (Tab/flechas/Enter), y la opción activa se anuncia de forma nativa (equivalente a
 * `aria-current`). `aria-label` proviene de `t('localeSwitcher.label')` (namespace `navigation`).
 */
export function LocaleSwitcher(): React.JSX.Element {
  const t = useTranslations('navigation');
  const { locale, supportedLocales, setLocale } = useLocale();

  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setLocale(event.target.value as Locale);
  };

  return (
    <select
      aria-label={t('localeSwitcher.label')}
      value={locale}
      onChange={onChange}
      className="rounded border border-gray-300 px-2 py-1"
    >
      {supportedLocales.map((option) => (
        <option key={option} value={option}>
          {localeLabels[option]}
        </option>
      ))}
    </select>
  );
}
