'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '../actions/IconButton';
import { cx } from '../internal/cx';
import type { NavigationSection } from './navigationModel';
import { SidebarSection } from './SidebarSection';

/**
 * MobileNavigationDrawer — navegación principal en mobile.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20
 * (`MobileNavigationDrawer`), §30 (`Drawer`) y §37 (focus trap + retorno de foco).
 * Referencia visual: screen Stitch *Navigation & Feedback — Móvil* (panel a pantalla parcial,
 * cabecera con título y cierre, bloque de usuario al pie).
 *
 * **No es la sidebar encogida**: es una adaptación propia (panel deslizante a pantalla casi
 * completa, objetivos táctiles de 44 px, bloque de cuenta al pie). Aun así consume **el mismo
 * modelo de navegación** que `AppSidebar` — no existe una segunda definición de rutas.
 *
 * `Dialog` de Headless UI aporta de forma nativa: focus trap, `Escape` cierra, clic fuera cierra,
 * retorno del foco al trigger y bloqueo del scroll del body mientras está abierto. Se prefiere a
 * una implementación propia por eso mismo, y ya era la primitiva instalada en el repositorio.
 */
export interface MobileNavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Nombre accesible del landmark `<nav>` interior, ya traducido. */
  ariaLabel: string;
  /** Título visible del drawer (también es el nombre accesible del diálogo). */
  title: ReactNode;
  /** Nombre accesible del botón de cierre, ya traducido. */
  closeLabel: string;
  sections: readonly NavigationSection[];
  /** Bloque de cuenta / acciones al pie (nombre, email, cerrar sesión). Opcional. */
  footer?: ReactNode;
  /**
   * Se dispara al activar cualquier enlace del panel. Se propaga hasta el `<a>` de cada
   * `SidebarItem`, de modo que `Enter` funciona igual que el clic sin colgar handlers de
   * elementos no interactivos.
   *
   * El consumidor que navega entre rutas puede cerrar el drawer observando el `pathname`, pero
   * eso no cubre los enlaces de ancla (`#seccion`) de una landing: la URL cambia sin cambiar de
   * ruta y el panel se quedaría abierto tapando justo la sección a la que se ha saltado.
   */
  onNavigate?: () => void;
  /** `id` del panel, para enlazarlo con `aria-controls` del trigger. */
  panelId?: string;
  className?: string;
}

export function MobileNavigationDrawer({
  open,
  onClose,
  ariaLabel,
  title,
  closeLabel,
  sections,
  footer,
  onNavigate,
  panelId,
  className,
}: MobileNavigationDrawerProps): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} className={cx('relative z-drawer lg:hidden', className)}>
      <div className="fixed inset-0 bg-scrim-light" aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 flex w-sidebar max-w-[85vw]">
        <DialogPanel
          id={panelId}
          // Mismo cromo que la sidebar de desktop: el drawer es su equivalente en mobile.
          className="flex w-full flex-col overflow-y-auto bg-sidebar shadow-overlay-modal"
        >
          <div className="flex items-center justify-between gap-2 border-b border-chrome p-4">
            <DialogTitle className="min-w-0 truncate font-heading text-h3 font-semibold text-link">
              {title}
            </DialogTitle>
            <IconButton icon={<X />} variant="subtle" aria-label={closeLabel} onClick={onClose} />
          </div>
          <nav
            aria-label={ariaLabel}
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4"
          >
            {sections.map((section) => (
              <SidebarSection key={section.id} section={section} onNavigate={onNavigate} />
            ))}
          </nav>
          {footer ? (
            <div className="mt-auto border-t border-chrome bg-sidebar-footer p-4">{footer}</div>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
