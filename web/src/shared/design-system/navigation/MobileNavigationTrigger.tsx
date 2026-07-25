'use client';

import { Menu } from 'lucide-react';
import { forwardRef } from 'react';
import { IconButton } from '../actions/IconButton';
import { cx } from '../internal/cx';

/**
 * MobileNavigationTrigger — abre `MobileNavigationDrawer` desde el `TopBar`.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20
 * (`MobileNavigationDrawer` → trigger) y §37 (touch target ≥ 44 × 44 px).
 *
 * - Reutiliza `IconButton`, que ya garantiza el mínimo táctil y exige nombre accesible.
 * - `aria-expanded` + `aria-controls` describen la relación con el panel del drawer.
 * - Oculto desde `lg`: en desktop la navegación es la `AppSidebar`.
 */
export interface MobileNavigationTriggerProps {
  /** Nombre accesible ya traducido (p. ej. `Abrir menú`). */
  label: string;
  isOpen: boolean;
  onOpen: () => void;
  /** `id` del panel del drawer para `aria-controls`. */
  controls?: string;
  className?: string;
}

export const MobileNavigationTrigger = forwardRef<HTMLButtonElement, MobileNavigationTriggerProps>(
  function MobileNavigationTrigger({ label, isOpen, onOpen, controls, className }, ref) {
    return (
      <IconButton
        ref={ref}
        icon={<Menu />}
        variant="subtle"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={controls}
        onClick={onOpen}
        className={cx('lg:hidden', className)}
      />
    );
  },
);
