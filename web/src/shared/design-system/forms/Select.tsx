'use client';

import { ChevronDown } from 'lucide-react';
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { isAriaInvalid } from '../internal/a11y';
import { cx } from '../internal/cx';
import { FIELD_FOCUS, FIELD_HEIGHT, FIELD_TEXT, fieldSurface, type FieldSize } from './fieldStyles';

/**
 * Select — selección única.
 *
 * **Decisión de implementación (cierra CMP-Q-005 para el MVP):** `<select>` nativo.
 * Motivos: ya es el patrón instalado en el frontend (filtros admin, wizard, paginación), no
 * añade dependencias, resuelve por sí solo teclado, typeahead y la hoja nativa en móvil, y
 * tolera labels traducidos largos. Headless UI queda reservado para `MultiSelect`, donde no
 * existe equivalente nativo aceptable.
 *
 * El estilo de Stitch (`<select>` plano con borde) **no** se copia literalmente: se usan los
 * tokens `input.*` y el indicador `ChevronDown` de Lucide.
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  selectSize?: FieldSize;
  /** Opciones declarativas. Alternativamente se pueden pasar `<option>` como `children`. */
  options?: readonly SelectOption[];
  /** Texto de la opción vacía (valor `''`). No sustituye al label del `FormField`. */
  placeholder?: string;
  invalid?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    selectSize = 'md',
    options,
    placeholder,
    invalid,
    fullWidth = true,
    className,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const hasError = invalid === true || isAriaInvalid(rest['aria-invalid']);

  return (
    <div className={cx('relative', fullWidth ? 'w-full' : 'inline-block')}>
      <select
        {...rest}
        ref={ref}
        disabled={disabled}
        className={cx(
          fieldSurface({ invalid: hasError, disabled }),
          FIELD_FOCUS,
          FIELD_HEIGHT[selectSize],
          FIELD_TEXT[selectSize],
          // `appearance-none` + chevron propio: el triángulo nativo no es tokenizable.
          'w-full appearance-none py-0 pl-3 pr-9 font-body',
          className,
        )}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute right-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2',
          disabled ? 'text-disabled' : 'text-secondary',
        )}
      />
    </div>
  );
});
