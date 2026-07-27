'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spinner } from '../feedback/Spinner';
import { cx } from '../internal/cx';

/**
 * LanguageSelector — selección de idioma de la interfaz.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`LanguageSelector`) y
 * `docs/ux-ui/EventFlow-UI-Foundations.md` §24 (cuatro locales; cada opción se etiqueta en su
 * propio idioma).
 *
 * Es **presentacional**: no conoce `next-intl`, cookies ni el endpoint de preferencia de idioma.
 * La implementación de negocio (optimistic UI, rollback, persistencia) vive en
 * `shared/i18n/LanguageSelector`, que monta esta pieza — no se duplicó el comportamiento.
 *
 * `Listbox` de Headless UI aporta `role="listbox"` / `role="option"` + `aria-selected`, y la
 * navegación por teclado (flechas, `Home`/`End`, `Enter`, `Escape`).
 */
export interface LanguageOption {
  value: string;
  /** Nombre del idioma **en su propio idioma** (`Español (LATAM)`, `Português`, `English`). */
  label: string;
  /** Texto corto mostrado en el trigger y como pista en la opción (p. ej. el código de locale). */
  short?: string;
}

export interface LanguageSelectorProps {
  /** Nombre accesible del control, ya traducido (p. ej. `Cambiar idioma`). */
  label: string;
  value: string;
  options: readonly LanguageOption[];
  onChange: (next: string) => void;
  /** Deshabilita el control y muestra el spinner mientras se persiste la preferencia. */
  isPending?: boolean;
  /** Mensaje de error contextual (normalmente un `InlineMessage`). */
  error?: ReactNode;
  className?: string;
}

export function LanguageSelector({
  label,
  value,
  options,
  onChange,
  isPending = false,
  error,
  className,
}: LanguageSelectorProps): React.JSX.Element {
  const current = options.find((option) => option.value === value);

  return (
    <div className={cx('relative', className)}>
      <Listbox value={value} onChange={onChange}>
        <ListboxButton
          aria-label={label}
          disabled={isPending}
          className="focus-ring inline-flex min-h-touch items-center gap-1.5 rounded-button border border-default px-2 py-1 font-ui text-body-sm text-primary hover:bg-action-secondary-hover disabled:opacity-disabled"
        >
          <Globe aria-hidden="true" className="h-icon-sm w-icon-sm shrink-0" />
          <span data-testid="language-selector-current">{current?.short ?? value}</span>
          {isPending ? <Spinner size="sm" inline data-testid="language-selector-spinner" /> : null}
        </ListboxButton>
        <ListboxOptions
          anchor="bottom end"
          className="mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-card border border-subtle bg-surface-elevated py-1 shadow-overlay-dropdown focus:outline-none"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="flex min-h-touch cursor-pointer items-center justify-between gap-2 px-3 py-2 font-ui text-body-sm text-primary data-[focus]:bg-action-ghost-hover data-[selected]:font-semibold"
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {option.short ? (
                <span aria-hidden="true" className="shrink-0 text-caption text-muted">
                  {option.short}
                </span>
              ) : null}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
      {error}
    </div>
  );
}
