'use client';

import { Popover as HeadlessPopover, PopoverButton, PopoverPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { warnMissingAccessibleName } from '../internal/a11y';
import { cx } from '../internal/cx';

/**
 * Popover — contenido contextual anclado a un disparador.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §30 (`Popover`).
 * Referencia visual: screen Stitch *Data & Overlays*. El contenido del ejemplo (bandeja de
 * notificaciones) **no** se implementa aquí: es una composición del feature de notificaciones,
 * que ya tiene su propio modelo de datos y su badge.
 *
 * Diferencia con `Tooltip`: el Popover admite **interacción y foco** (enlaces, botones). Y con
 * `Modal`: no bloquea el resto de la página, por lo que **no** debe alojar flujos críticos ni
 * decisiones destructivas — para eso está `Modal` / `ConfirmationDialog`, también en móvil.
 *
 * Del `Popover` de Headless UI vienen: `Escape`, cierre por clic fuera, retorno del foco al
 * trigger, gestión del foco dentro del panel y reposicionamiento dentro del viewport.
 */
export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';
export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  /** Contenido visible del disparador. */
  trigger: ReactNode;
  /** Nombre accesible del disparador. Obligatorio cuando el trigger es sólo un icono. */
  triggerAriaLabel?: string;
  iconOnly?: boolean;
  /** Título del panel, ya traducido. */
  title?: ReactNode;
  /** Contenido. Como función recibe `close` para cerrar tras una acción del propio panel. */
  children: ReactNode | ((helpers: { close: () => void }) => ReactNode);
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Ancho del panel. Por defecto responsive y acotado al viewport. */
  panelClassName?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Popover({
  trigger,
  triggerAriaLabel,
  iconOnly = false,
  title,
  children,
  side = 'bottom',
  align = 'center',
  panelClassName,
  disabled = false,
  className,
  'data-testid': testId,
}: PopoverProps): React.JSX.Element {
  if (iconOnly && !triggerAriaLabel) warnMissingAccessibleName('Popover');

  return (
    <HeadlessPopover className={cx('relative inline-block', className)}>
      <PopoverButton
        aria-label={triggerAriaLabel}
        disabled={disabled}
        data-testid={testId}
        className={cx(
          'focus-ring inline-flex min-h-touch items-center justify-center gap-2 rounded-button',
          'font-ui text-body-sm font-medium text-primary',
          'transition-colors duration-fast ease-standard hover:bg-action-ghost-hover',
          'disabled:cursor-not-allowed disabled:opacity-disabled',
          iconOnly ? 'min-w-touch px-2' : 'px-3',
        )}
      >
        {iconOnly ? (
          <span aria-hidden="true" className="inline-flex [&>svg]:h-icon-md [&>svg]:w-icon-md">
            {trigger}
          </span>
        ) : (
          trigger
        )}
      </PopoverButton>
      <PopoverPanel
        anchor={align === 'center' ? side : `${side} ${align}`}
        className={cx(
          'z-dropdown mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-card border border-subtle',
          'bg-surface-elevated p-4 shadow-overlay-dropdown focus:outline-none',
          panelClassName,
        )}
      >
        {({ close }) => (
          <>
            {title ? (
              <p className="mb-2 font-heading text-body-md font-semibold text-primary">{title}</p>
            ) : null}
            {typeof children === 'function' ? children({ close }) : children}
          </>
        )}
      </PopoverPanel>
    </HeadlessPopover>
  );
}
