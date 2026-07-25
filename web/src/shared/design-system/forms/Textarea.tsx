'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { isAriaInvalid } from '../internal/a11y';
import { cx } from '../internal/cx';
import { FIELD_FOCUS, fieldSurface } from './fieldStyles';

/**
 * Textarea — texto multilínea (Component Foundations §16 `Textarea`).
 *
 * - Redimensionado **vertical** permitido, horizontal deshabilitado (§16).
 * - El contador de caracteres vive en `FormField` (`characterCount`), que además lo asocia por
 *   `aria-describedby`; aquí sólo se limita con `maxLength` si el consumidor lo pide.
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Filas mínimas visibles. Por defecto 3 (`input.height` × 3, §16). */
  minRows?: number;
  invalid?: boolean;
  fullWidth?: boolean;
  /** `vertical` (default) o `none` cuando el layout no puede crecer. */
  resize?: 'vertical' | 'none';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    minRows = 3,
    invalid,
    fullWidth = true,
    resize = 'vertical',
    className,
    disabled,
    readOnly,
    ...rest
  },
  ref,
) {
  const hasError = invalid === true || isAriaInvalid(rest['aria-invalid']);

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={rest.rows ?? minRows}
      disabled={disabled}
      readOnly={readOnly}
      className={cx(
        fieldSurface({ invalid: hasError, disabled, readOnly }),
        FIELD_FOCUS,
        'px-3 py-2 font-body text-body-md placeholder:text-muted',
        resize === 'vertical' ? 'resize-y' : 'resize-none',
        fullWidth && 'w-full',
        className,
      )}
    />
  );
});
