'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { describedBy } from '../internal/a11y';
import { cx } from '../internal/cx';

/**
 * Checkbox — casilla nativa con label clicable completo (Component Foundations §17).
 *
 * - Se usa `<input type="checkbox">` nativo: teclado, `aria-checked` y soporte de formulario
 *   vienen gratis y no se añade ARIA redundante.
 * - `indeterminate` no existe como atributo HTML: se aplica sobre la **propiedad DOM**.
 * - `.hit-area` amplía el área de pulsación del label a 44 px sin alterar el layout.
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  /** Texto de apoyo bajo el label. */
  description?: ReactNode;
  /** Mensaje de error asociado por `aria-describedby` + `aria-invalid`. */
  error?: ReactNode;
  /** Estado mixto (grupo padre parcialmente seleccionado). */
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, error, indeterminate = false, id, className, disabled, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-checkbox`;
  const descriptionId = `${generatedId}-description`;
  const errorId = `${generatedId}-error`;
  const innerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          {...rest}
          id={inputId}
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="checkbox"
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy(
            description ? descriptionId : undefined,
            hasError ? errorId : undefined,
            rest['aria-describedby'],
          )}
          className={cx(
            'focus-ring mt-0.5 h-5 w-5 shrink-0 rounded-sm border accent-[color:var(--color-action-primary)]',
            hasError ? 'border-feedback-error' : 'border-default',
            'disabled:cursor-not-allowed disabled:border-disabled disabled:bg-surface-disabled',
            className,
          )}
        />
        <label
          htmlFor={inputId}
          className={cx(
            'hit-area flex cursor-pointer flex-col font-body text-body-md',
            disabled ? 'cursor-not-allowed text-disabled' : 'text-primary',
          )}
        >
          <span>{label}</span>
          {description ? (
            <span id={descriptionId} className="text-body-sm text-secondary">
              {description}
            </span>
          ) : null}
        </label>
      </div>
      {hasError ? (
        <p
          id={errorId}
          role="alert"
          className="font-ui text-body-sm font-medium text-feedback-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});
