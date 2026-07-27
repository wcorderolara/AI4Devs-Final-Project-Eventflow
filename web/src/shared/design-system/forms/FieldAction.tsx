'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { warnMissingAccessibleName } from '../internal/a11y';
import { cx } from '../internal/cx';

/**
 * Acción compacta **dentro** de un campo (limpiar búsqueda, mostrar/ocultar contraseña).
 *
 * No es un `IconButton`: su caja es 32 × 32 px para caber dentro de un control de 40 px. Es la
 * excepción consciente al mínimo táctil de 44 px que sí aplica a los controles icon-only
 * autónomos — un campo ocupa todo el ancho de la columna y esta acción es secundaria y siempre
 * alcanzable por teclado. Queda registrada como desviación conocida en el implementation record.
 *
 * El nombre accesible es obligatorio igual que en `IconButton`.
 */
export interface FieldActionProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  icon: ReactNode;
  'aria-label': string;
}

export const FieldAction = forwardRef<HTMLButtonElement, FieldActionProps>(function FieldAction(
  { icon, className, type = 'button', ...rest },
  ref,
) {
  if (typeof rest['aria-label'] !== 'string' || rest['aria-label'].trim().length === 0) {
    warnMissingAccessibleName('FieldAction');
  }

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={cx(
        'focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-button',
        'text-secondary transition-colors duration-fast ease-standard',
        'hover:bg-action-ghost-hover hover:text-primary',
        'disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent',
        className,
      )}
    >
      <span aria-hidden="true" className="inline-flex h-icon-sm w-icon-sm">
        {icon}
      </span>
    </button>
  );
});
