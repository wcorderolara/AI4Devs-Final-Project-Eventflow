'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { isAriaInvalid } from '../internal/a11y';
import { cx } from '../internal/cx';
import {
  FIELD_FOCUS,
  FIELD_HEIGHT,
  FIELD_INNER_CONTROL,
  FIELD_TEXT,
  fieldSurface,
  type FieldSize,
} from './fieldStyles';

/**
 * Input — entrada de texto de una línea (Component Foundations §16).
 *
 * Se compone con `FormField`, que aporta label, helper, error y los `aria-*`. El componente
 * sólo presenta: no valida, no traduce y no conoce el dominio.
 *
 * - Sin adornos renderiza un `<input>` desnudo con el foco canónico `.focus-ring`.
 * - Con `leadingIcon`, `prefix`, `suffix` o `trailingContent` se envuelve en un contenedor que
 *   pinta el borde y el anillo (`.focus-ring-within`), y el `<input>` queda transparente.
 * - El estado de error se deriva de `aria-invalid` (lo inyecta `FormField`) o de `invalid`.
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  inputSize?: FieldSize;
  /** Icono Lucide decorativo al inicio del control. */
  leadingIcon?: ReactNode;
  /** Contenido interactivo al final (por ejemplo un `IconButton` de limpiar o mostrar). */
  trailingContent?: ReactNode;
  /** Texto fijo antes del valor (por ejemplo un código ISO de moneda). */
  prefix?: ReactNode;
  /** Texto fijo después del valor (por ejemplo una unidad). */
  suffix?: ReactNode;
  /** Fuerza el estado de error cuando el consumidor no usa `FormField`. */
  invalid?: boolean;
  /** Ocupa todo el ancho disponible. Activado por defecto (formularios de una columna). */
  fullWidth?: boolean;
  /** Clases para el contenedor cuando hay adornos. */
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    leadingIcon,
    trailingContent,
    prefix,
    suffix,
    invalid,
    fullWidth = true,
    className,
    containerClassName,
    disabled,
    readOnly,
    type = 'text',
    ...rest
  },
  ref,
) {
  const hasError = invalid === true || isAriaInvalid(rest['aria-invalid']);
  const decorated = Boolean(leadingIcon || trailingContent || prefix || suffix);
  const surface = fieldSurface({ invalid: hasError, disabled, readOnly });

  if (!decorated) {
    return (
      <input
        {...rest}
        ref={ref}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        className={cx(
          surface,
          FIELD_FOCUS,
          FIELD_HEIGHT[inputSize],
          FIELD_TEXT[inputSize],
          'px-3 font-body placeholder:text-muted',
          fullWidth && 'w-full',
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cx(
        surface,
        'focus-ring-within flex items-center gap-2 px-3',
        FIELD_HEIGHT[inputSize],
        FIELD_TEXT[inputSize],
        fullWidth && 'w-full',
        containerClassName,
      )}
    >
      {leadingIcon ? (
        <span
          aria-hidden="true"
          className={cx(
            'inline-flex h-icon-md w-icon-md shrink-0 items-center justify-center',
            disabled ? 'text-disabled' : 'text-muted',
          )}
        >
          {leadingIcon}
        </span>
      ) : null}
      {prefix ? (
        <span className="shrink-0 font-ui text-body-sm text-secondary">{prefix}</span>
      ) : null}
      <input
        {...rest}
        ref={ref}
        type={type}
        disabled={disabled}
        readOnly={readOnly}
        className={cx(FIELD_INNER_CONTROL, FIELD_TEXT[inputSize], 'h-full', className)}
      />
      {suffix ? (
        <span className="shrink-0 font-ui text-body-sm text-secondary">{suffix}</span>
      ) : null}
      {trailingContent ? (
        <span className="flex shrink-0 items-center">{trailingContent}</span>
      ) : null}
    </div>
  );
});
