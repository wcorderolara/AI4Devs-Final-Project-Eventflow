'use client';

import { forwardRef } from 'react';
import { localeLabels } from '@/shared/i18n';
import { EVENT_LANGUAGES, type LanguageCode } from '../api/eventsApi.types';

/**
 * `EventLanguageSelector` (US-082 / FE-001; AC-01/AC-02/AC-05). Selector reusable del idioma
 * del evento — mismo shape aceptado por RHF `register(...)` (nativo `<select>` con `ref`,
 * `name`, `onChange`, `onBlur`) más `disabled` para bloquear la edición cuando el evento está
 * en un estado terminal (`completed`/`cancelled`, AC-04).
 *
 * Muestra el nombre nativo de cada locale (`Español (LATAM)`, `Português`, …) reusando la fuente
 * canónica `localeLabels` de `@/shared/i18n` (US-104). Sin optimistic — la persistencia del
 * cambio la ejecuta el submit del wizard (US-009) o del edit form (US-010).
 */
export type EventLanguageSelectorProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Bloquea la interacción — se pasa como `disabled` al `<select>`. Útil para AC-04. */
  disabled?: boolean;
};

export const EventLanguageSelector = forwardRef<HTMLSelectElement, EventLanguageSelectorProps>(
  function EventLanguageSelector({ className, disabled, ...rest }, ref) {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={
          className ??
          'mt-1 w-full rounded border border-neutral-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500'
        }
        {...rest}
      >
        {EVENT_LANGUAGES.map((code: LanguageCode) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    );
  },
);
