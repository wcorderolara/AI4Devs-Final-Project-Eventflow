'use client';

// ValidUntilPicker (US-053 / FE-001).
// Wrapper accesible sobre `<input type="date">` que aplica:
//   - Default `today + 15d` (BR-QUOTE-015 / C-031, alineado con el UC de US-052).
//   - Rango client-side `[today+1, today+90]` vía `min` / `max`.
//   - Feedback inline con `aria-invalid` + `aria-describedby` + helper text i18n.
//   - Integrable con `react-hook-form` vía `forwardRef` (para `register(...)` del padre).
//
// Se prefiere `<input type="date">` nativo sobre `react-day-picker` para (a) no agregar una
// dependencia por un único form, (b) que el UA del usuario ofrezca su propio picker accesible
// y keyboard-navigable por defecto, y (c) que el shape `YYYY-MM-DD` case 1:1 con el DTO Zod del
// backend US-052 sin transformaciones.
import { forwardRef, useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MIN_OFFSET_DAYS = 1;
const MAX_OFFSET_DAYS = 90;
const DEFAULT_OFFSET_DAYS = 15;

/** Calcula un `YYYY-MM-DD` sumando `offsetDays` a `today` en UTC. */
export function addDaysUtc(base: Date, offsetDays: number): string {
  const d = new Date(base.getTime());
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return ymd(d);
}

export interface ValidUntilPickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max'> {
  /** Etiqueta accesible (obligatoria — el picker no puede ir sin label). */
  label: string;
  /** Texto de ayuda opcional; queda enlazado por `aria-describedby`. */
  helpText?: string;
  /** Mensaje de error opcional; cuando está presente activa `aria-invalid`. */
  errorMessage?: string;
  /** `Date` de referencia (default `new Date()`) — inyectable para tests deterministas. */
  today?: Date;
}

/**
 * Picker accesible con default `today + 15d` y rango `[today+1, today+90]`. Los `min`/`max`
 * los aplica el UA nativo — el backend re-valida en el UC (defensa en profundidad).
 */
export const ValidUntilPicker = forwardRef<HTMLInputElement, ValidUntilPickerProps>(
  function ValidUntilPicker(
    { label, helpText, errorMessage, today, id: idProp, defaultValue, ...rest },
    ref,
  ) {
    const t = useTranslations('vendor.qr.respond.validUntilPicker');
    const generatedId = useId();
    const helpId = useId();
    const errorId = useId();
    const id = idProp ?? generatedId;

    const { min, max, defaultVal } = useMemo(() => {
      const base = today ?? new Date();
      return {
        min: addDaysUtc(base, MIN_OFFSET_DAYS),
        max: addDaysUtc(base, MAX_OFFSET_DAYS),
        defaultVal: addDaysUtc(base, DEFAULT_OFFSET_DAYS),
      };
    }, [today]);

    const describedBy = [
      helpText || helpId ? helpId : null,
      errorMessage ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-neutral-900">
          {label}
        </label>
        <input
          id={id}
          ref={ref}
          type="date"
          min={min}
          max={max}
          defaultValue={defaultValue ?? defaultVal}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={describedBy || undefined}
          className="mt-1 w-full max-w-xs rounded border border-neutral-300 px-3 py-2 text-sm"
          {...rest}
        />
        <p id={helpId} className="mt-1 text-xs text-neutral-500">
          {helpText ?? t('help', { min, max })}
        </p>
        {errorMessage && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-700">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);
