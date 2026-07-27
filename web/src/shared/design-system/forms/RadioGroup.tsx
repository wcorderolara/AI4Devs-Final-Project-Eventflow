'use client';

import { useId, type ReactNode } from 'react';
import { describedBy } from '../internal/a11y';
import { cx } from '../internal/cx';

/**
 * RadioGroup — selección única entre opciones visibles (Component Foundations §17).
 *
 * - Semántica nativa `<fieldset>` + `<legend>` + `<input type="radio">` con `name` compartido:
 *   la navegación con flechas, el `role="radiogroup"` implícito y el estado `checked` los aporta
 *   el navegador. No se añade ARIA redundante sobre controles nativos.
 * - Usar hasta ~6 opciones; por encima, `Select` (§17).
 */
export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Nombre del grupo; agrupa los radios nativos. */
  name: string;
  /** Texto visible del grupo, renderizado como `<legend>`. */
  legend: ReactNode;
  options: readonly RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  helperText?: ReactNode;
  error?: ReactNode;
  /** Deshabilita el grupo completo. */
  disabled?: boolean;
  required?: boolean;
  requiredIndicator?: ReactNode;
  className?: string;
}

export function RadioGroup({
  name,
  legend,
  options,
  value,
  onChange,
  helperText,
  error,
  disabled = false,
  required = false,
  requiredIndicator,
  className,
}: RadioGroupProps): React.JSX.Element {
  const generatedId = useId();
  const helperId = `${generatedId}-helper`;
  const errorId = `${generatedId}-error`;
  const hasError = Boolean(error);

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={describedBy(
        helperText ? helperId : undefined,
        hasError ? errorId : undefined,
      )}
      aria-invalid={hasError ? true : undefined}
      aria-required={required ? true : undefined}
      className={cx('flex flex-col gap-2 border-0 p-0', className)}
    >
      <legend
        className={cx(
          'font-ui text-label font-medium',
          disabled ? 'text-disabled' : 'text-primary',
        )}
      >
        {legend}
        {required && requiredIndicator ? (
          <span className="ml-1 text-feedback-error">{requiredIndicator}</span>
        ) : null}
      </legend>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const optionId = `${generatedId}-${option.value}`;
          const optionDescriptionId = `${optionId}-description`;
          const optionDisabled = disabled || option.disabled === true;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={optionDisabled}
                onChange={() => onChange(option.value)}
                aria-describedby={option.description ? optionDescriptionId : undefined}
                className={cx(
                  'focus-ring mt-0.5 h-5 w-5 shrink-0 border accent-[color:var(--color-action-primary)]',
                  hasError ? 'border-feedback-error' : 'border-default',
                  'disabled:cursor-not-allowed disabled:border-disabled disabled:bg-surface-disabled',
                )}
              />
              <label
                htmlFor={optionId}
                className={cx(
                  'hit-area flex cursor-pointer flex-col font-body text-body-md',
                  optionDisabled ? 'cursor-not-allowed text-disabled' : 'text-primary',
                )}
              >
                <span>{option.label}</span>
                {option.description ? (
                  <span id={optionDescriptionId} className="text-body-sm text-secondary">
                    {option.description}
                  </span>
                ) : null}
              </label>
            </div>
          );
        })}
      </div>

      {helperText ? (
        <p id={helperId} className="font-body text-caption text-secondary">
          {helperText}
        </p>
      ) : null}
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="font-ui text-body-sm font-medium text-feedback-error"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
