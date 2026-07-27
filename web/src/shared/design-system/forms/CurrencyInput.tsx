'use client';

import { forwardRef, useId, useState, type FocusEvent } from 'react';
import { describedBy } from '../internal/a11y';
import {
  formatAmountForDisplay,
  formatAmountForEditing,
  parseAmountInput,
  roundToDecimals,
} from './currencyParsing';
import { Input, type InputProps } from './Input';

/**
 * CurrencyInput — monto monetario (Component Foundations §16 `CurrencyInput`).
 *
 * Reglas de negocio respetadas:
 * - **Sin conversión** de moneda (BR-BUDGET-007): el componente sólo formatea.
 * - **Moneda inmutable** (BR-EVENT-007): `currencyCode` es un prefijo de sólo lectura; el
 *   componente no ofrece selector de moneda en ningún estado.
 * - El **código ISO siempre visible** porque `$` es ambiguo entre GTQ/USD/MXN/COP (§16), y se
 *   añade al `aria-describedby` para que también lo anuncie el lector de pantalla.
 * - El valor canónico es **numérico** (`onValueChange`); nunca se persiste la cadena formateada.
 *
 * Mientras el campo tiene el foco se muestra el valor editable sin agrupación; al salir se
 * reformatea según el locale.
 */
export interface CurrencyInputProps extends Omit<
  InputProps,
  'value' | 'onChange' | 'type' | 'prefix' | 'inputMode'
> {
  /** Código ISO 4217 del evento (`GTQ`, `USD`, …). Visible y no editable. */
  currencyCode: string;
  /** Valor canónico. `null` representa el campo vacío. */
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Locale BCP-47 para el formato de presentación. */
  locale?: string;
  /** Decimales del monto. 2 por defecto. */
  decimals?: number;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      currencyCode,
      value,
      onValueChange,
      locale = 'es-419',
      decimals = 2,
      readOnly,
      disabled,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const prefixId = useId();
    const [draft, setDraft] = useState<string | null>(null);

    const displayValue =
      draft !== null
        ? draft
        : value === null
          ? ''
          : formatAmountForDisplay(value, locale, decimals);

    const handleFocus = (event: FocusEvent<HTMLInputElement>): void => {
      if (!readOnly && !disabled) {
        setDraft(value === null ? '' : formatAmountForEditing(value, locale, decimals));
      }
      onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
      setDraft(null);
      onBlur?.(event);
    };

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        readOnly={readOnly}
        disabled={disabled}
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = parseAmountInput(next);
          onValueChange(parsed === null ? null : roundToDecimals(parsed, decimals));
        }}
        prefix={
          <span id={prefixId} data-testid="currencyInput.code">
            {currencyCode}
          </span>
        }
        aria-describedby={describedBy(rest['aria-describedby'], prefixId)}
      />
    );
  },
);
