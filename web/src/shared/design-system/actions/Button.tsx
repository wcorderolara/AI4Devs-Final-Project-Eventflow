'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../internal/cx';
import { Spinner } from '../internal/Spinner';
import {
  ACTION_BASE,
  ACTION_ICON_SIZE,
  ACTION_SIZE,
  ACTION_VARIANT,
  type ActionSize,
  type ActionVariant,
} from './actionStyles';

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
export type ButtonVariant = ActionVariant;
export type ButtonSize = ActionSize;

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

// Las escalas visuales viven en `actionStyles.ts`: las comparte con `ActionLink`, la misma
// acción cuando su efecto es navegar.
const VARIANT = ACTION_VARIANT;
const SIZE = ACTION_SIZE;
const ICON_SIZE = ACTION_ICON_SIZE;

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
        ACTION_BASE,
        'disabled:cursor-not-allowed',
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
