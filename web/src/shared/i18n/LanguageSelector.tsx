'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Globe, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { locales, localeLabels, type Locale } from './config';
import { useLocaleSwitcher } from './useLocaleSwitcher';

/**
 * `LanguageSelector` global (US-081 / AC-05). Dropdown accesible con icono de globo + código de
 * locale actual y lista de 4 opciones etiquetadas en su idioma nativo. HeadlessUI `Listbox`
 * emite las semánticas ARIA requeridas por la Tech Spec: `role="listbox"` para el contenedor,
 * `role="option"` con `aria-selected` para cada item, y keyboard navigation (Arrow/Home/End/
 * Enter/Escape). El cambio se aplica de inmediato (optimistic UI) — ver `useLocaleSwitcher`.
 */
export function LanguageSelector(): React.JSX.Element {
  const t = useTranslations('common');
  const { currentLocale, switchLocale, isPending, error, clearError } = useLocaleSwitcher();

  const onChange = (next: Locale): void => {
    switchLocale(next);
  };

  return (
    <div className="relative">
      <Listbox value={currentLocale} onChange={onChange}>
        <ListboxButton
          aria-label={t('languageSelector.label')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 disabled:opacity-50"
        >
          <Globe aria-hidden="true" className="h-4 w-4" />
          <span data-testid="language-selector-current">{currentLocale}</span>
          {isPending ? (
            <Loader2
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin text-neutral-500"
              data-testid="language-selector-spinner"
            />
          ) : null}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom end"
          className="mt-1 w-52 rounded border border-neutral-200 bg-white py-1 shadow-lg focus:outline-none"
        >
          {locales.map((code) => (
            <ListboxOption
              key={code}
              value={code}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm data-[focus]:bg-neutral-100 data-[selected]:font-semibold"
            >
              <span>{localeLabels[code]}</span>
              <span aria-hidden="true" className="text-xs text-neutral-500">
                {code}
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      {error === 'SAVE_FAILED' ? (
        <p
          role="alert"
          aria-live="polite"
          data-testid="language-selector-error"
          className="absolute right-0 top-full mt-1 w-64 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
        >
          {t('languageSelector.error')}
          <button
            type="button"
            onClick={clearError}
            className="ml-2 underline"
            aria-label={t('languageSelector.dismiss')}
          >
            {t('languageSelector.dismiss')}
          </button>
        </p>
      ) : null}
    </div>
  );
}
