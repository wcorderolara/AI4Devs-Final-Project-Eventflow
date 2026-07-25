'use client';

import { forwardRef, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { warnMissingAccessibleName } from '../internal/a11y';
import { cx } from '../internal/cx';
import { Spinner } from '../internal/Spinner';

/**
 * IconButton — acción compacta cuyo significado lo comunica el icono.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §11 `IconButton`.
 *
 * - **Nombre accesible obligatorio** (`aria-label` o `aria-labelledby`). En desarrollo y test se
 *   emite un `console.error` cuando falta; un Tooltip **no** sustituye al nombre accesible.
 * - El área táctil es siempre ≥ 44 × 44 px (UI-DEC-015); `size` gradúa el tamaño del icono,
 *   no el mínimo táctil.
 * - Solo iconos `lucide-react` (única librería ratificada).
 */
export type IconButtonVariant = 'default' | 'subtle' | 'destructive';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Icono Lucide. Se renderiza `aria-hidden`: el nombre lo aporta `aria-label`. */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

const VARIANT: Record<IconButtonVariant, string> = {
  default:
    'border border-action-secondary bg-action-secondary text-primary hover:bg-action-secondary-hover',
  subtle: 'bg-transparent text-secondary hover:bg-action-ghost-hover',
  destructive: 'bg-transparent text-feedback-error hover:bg-feedback-error',
};

/** El contenedor mantiene el mínimo táctil (`min-h-touch`/`min-w-touch` = 44 px); sólo cambia el glifo. */
const BOX: Record<IconButtonSize, string> = {
  sm: 'min-h-touch min-w-touch',
  md: 'min-h-touch min-w-touch',
  lg: 'min-h-touch min-w-touch h-12 w-12',
};

const ICON: Record<IconButtonSize, string> = {
  sm: 'h-icon-sm w-icon-sm',
  md: 'h-icon-md w-icon-md',
  lg: 'h-icon-lg w-icon-lg',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    variant = 'default',
    size = 'md',
    isLoading = false,
    disabled = false,
    className,
    onClick,
    type = 'button',
    ...rest
  },
  ref,
) {
  const hasAccessibleName =
    typeof rest['aria-label'] === 'string' && rest['aria-label'].trim().length > 0;
  const hasLabelledBy =
    typeof rest['aria-labelledby'] === 'string' && rest['aria-labelledby'].trim().length > 0;

  useEffect(() => {
    if (!hasAccessibleName && !hasLabelledBy) warnMissingAccessibleName('IconButton');
  }, [hasAccessibleName, hasLabelledBy]);

  const blocked = disabled || isLoading;

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={blocked}
      aria-busy={isLoading || undefined}
      onClick={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cx(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-button',
        'transition-colors duration-fast ease-standard',
        'disabled:cursor-not-allowed disabled:opacity-disabled',
        VARIANT[variant],
        BOX[size],
        className,
      )}
    >
      {isLoading ? (
        <Spinner className={ICON[size]} />
      ) : (
        <span aria-hidden="true" className={cx('inline-flex', ICON[size])}>
          {icon}
        </span>
      )}
    </button>
  );
});
