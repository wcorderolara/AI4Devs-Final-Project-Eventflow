'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../internal/cx';
import { Spinner } from '../internal/Spinner';

/**
 * Button — acción canónica de EventFlow.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §11 y §10 (modelo de
 * tamaños). Consume exclusivamente utilidades semánticas de `shared/design-tokens`.
 *
 * - `primary` usa la acción violeta de plataforma; `marketing` la CTA oscura de landing
 *   (CMP-DEC-013: misma pieza, variante contextual — no un componente aparte).
 * - `destructive` usa la familia error aprobada; nunca violeta/lila/coral (UI-DEC-014).
 * - El copy **nunca** vive dentro del componente: llega por `children` desde `next-intl`.
 */
export type ButtonVariant = 'primary' | 'marketing' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa el ancho disponible (patrón mobile para acciones primarias). */
  fullWidth?: boolean;
  /** Estado de carga: bloquea la acción, marca `aria-busy` y muestra el spinner. */
  isLoading?: boolean;
  /**
   * Texto que sustituye al label mientras `isLoading` (por ejemplo `Guardando…`).
   * Si se omite, el label original se conserva para no alterar el ancho del botón.
   */
  loadingLabel?: ReactNode;
  /** Icono Lucide decorativo antes del label. */
  leadingIcon?: ReactNode;
  /** Icono Lucide decorativo después del label. */
  trailingIcon?: ReactNode;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-action-primary-foreground hover:bg-action-primary-hover ' +
    'active:bg-action-primary-active disabled:bg-action-primary-disabled disabled:text-disabled',
  marketing:
    'bg-action-marketing text-action-marketing-foreground hover:bg-action-marketing-hover ' +
    'disabled:opacity-disabled',
  secondary:
    'border border-action-secondary bg-action-secondary text-primary ' +
    'hover:bg-action-secondary-hover disabled:opacity-disabled',
  ghost: 'bg-transparent text-primary hover:bg-action-ghost-hover disabled:opacity-disabled',
  destructive:
    'bg-action-destructive text-action-destructive-foreground hover:bg-action-destructive-hover ' +
    'disabled:opacity-disabled',
};

/**
 * Alturas de `size.control.*` (32/40/48). `sm` y `md` quedan por debajo del mínimo táctil de
 * 44 px, por lo que añaden `.hit-area` — expansión invisible del área de pulsación
 * (Component Foundations §10: "se logra con área táctil ampliada aun cuando el visual mida 32 px").
 */
const SIZE: Record<ButtonSize, string> = {
  sm: 'hit-area h-8 gap-2 px-3 text-body-sm',
  md: 'hit-area h-10 gap-2 px-4 text-body-sm',
  lg: 'h-12 gap-2 px-5 text-body-md',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-icon-sm w-icon-sm',
  md: 'h-icon-sm w-icon-sm',
  lg: 'h-icon-md w-icon-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    loadingLabel,
    leadingIcon,
    trailingIcon,
    disabled = false,
    className,
    children,
    onClick,
    // `type` explícito: un `<button>` sin type dentro de un `<form>` envía el formulario.
    type = 'button',
    ...rest
  },
  ref,
) {
  const blocked = disabled || isLoading;

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={blocked}
      aria-busy={isLoading || undefined}
      onClick={(event) => {
        // Guarda de doble disparo: `disabled` ya lo evita en el DOM, pero un consumidor puede
        // invocar el handler por otras vías (Component Foundations §11 `Behavior`).
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cx(
        'focus-ring inline-flex select-none items-center justify-center rounded-button font-ui font-semibold',
        'transition-colors duration-fast ease-standard disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {isLoading ? (
        <Spinner className={ICON_SIZE[size]} />
      ) : leadingIcon ? (
        <span aria-hidden="true" className={cx('shrink-0', ICON_SIZE[size])}>
          {leadingIcon}
        </span>
      ) : null}
      <span className="truncate">
        {isLoading && loadingLabel !== undefined ? loadingLabel : children}
      </span>
      {!isLoading && trailingIcon ? (
        <span aria-hidden="true" className={cx('shrink-0', ICON_SIZE[size])}>
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
});
