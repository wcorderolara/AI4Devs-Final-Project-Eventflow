'use client';

import { useState, type ReactNode } from 'react';
import { MobileNavigationDrawer, MobileNavigationTrigger } from '@/shared/design-system';
import type { NavigationSection } from '@/shared/design-system/navigation/navigationModel';

/**
 * PublicMobileMenu — navegación del header público por debajo de `lg`.
 *
 * **Reutiliza el drawer del shell autenticado** (`MobileNavigationDrawer`) en lugar de escribir
 * un menú propio: aquel ya resuelve, vía el `Dialog` de Headless UI, focus trap, cierre con
 * `Escape`, cierre al pulsar fuera, **retorno del foco al trigger** y bloqueo del scroll del body.
 * Reimplementarlo para la landing sería duplicar justo la parte difícil de hacer accesible.
 *
 * Es el **único** trozo de cliente del header: los destinos, los labels y los CTA llegan ya
 * resueltos y traducidos desde el Server Component padre, de modo que el estado de sesión no se
 * recalcula aquí y no hay parpadeo de hidratación. Este componente sólo posee el `open`/`close`.
 */
export interface PublicMobileMenuProps {
  /** Nombre accesible del trigger, ya traducido. */
  triggerLabel: string;
  /** Nombre accesible del botón de cierre, ya traducido. */
  closeLabel: string;
  /** Título visible del panel (también nombre accesible del diálogo), ya traducido. */
  title: string;
  /** Nombre accesible del `<nav>` interior, ya traducido. */
  navLabel: string;
  /** Secciones ya resueltas (label traducido, icono decorativo). */
  sections: readonly NavigationSection[];
  /** CTA del pie del panel, ya construidos por el servidor. */
  footer?: ReactNode;
}

const PANEL_ID = 'public-mobile-nav';

export function PublicMobileMenu({
  triggerLabel,
  closeLabel,
  title,
  navLabel,
  sections,
  footer,
}: PublicMobileMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MobileNavigationTrigger
        label={triggerLabel}
        isOpen={open}
        onOpen={() => setOpen(true)}
        controls={PANEL_ID}
      />
      <MobileNavigationDrawer
        open={open}
        onClose={() => setOpen(false)}
        panelId={PANEL_ID}
        title={title}
        ariaLabel={navLabel}
        closeLabel={closeLabel}
        sections={sections}
        footer={footer}
        // Cubre tanto los enlaces de ruta como las anclas de la propia landing: el panel no debe
        // quedarse abierto sobre la sección a la que se acaba de saltar.
        onNavigate={() => setOpen(false)}
      />
    </>
  );
}
