import type { ReactNode } from 'react';
import { cx } from '../internal/cx';
import type { NavigationSection } from './navigationModel';
import { SidebarSection } from './SidebarSection';

/**
 * AppSidebar — navegación principal del área autenticada en **desktop**.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`AppSidebar`),
 * `docs/ux-ui/EventFlow-UI-Foundations.md` §15 (UI-DEC-008) y §36 (breakpoints).
 *
 * - Visible desde `lg` (1024 px, `breakpoint.lg`); por debajo la sustituye
 *   `MobileNavigationDrawer` — no se encoge la sidebar.
 * - Ancho `layout.sidebar.width` (256 px) vía `w-sidebar`.
 * - **Expandida siempre**: el estado colapsado está fuera del MVP (CMP-DEC-005).
 * - No conoce rutas, roles ni permisos: recibe `sections` ya resueltas. Los ítems sin permiso
 *   los omite el consumidor, que es quien construye el modelo.
 * - `footer` sólo se monta cuando el producto ya tiene ese comportamiento; no se inventa.
 */
export interface AppSidebarProps {
  /** Nombre accesible del landmark `<nav>` ya traducido (p. ej. `Navegación de administración`). */
  ariaLabel: string;
  sections: readonly NavigationSection[];
  /** Contexto de workspace / rol (logo + badge). Opcional. */
  header?: ReactNode;
  /** Zona inferior fija (p. ej. acceso secundario). Opcional. */
  footer?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function AppSidebar({
  ariaLabel,
  sections,
  header,
  footer,
  className,
  'data-testid': testId,
}: AppSidebarProps): React.JSX.Element {
  return (
    <div
      data-testid={testId}
      className={cx(
        'hidden w-sidebar shrink-0 flex-col border-r border-subtle bg-surface lg:flex',
        className,
      )}
    >
      {header ? <div className="border-b border-subtle p-4">{header}</div> : null}
      <nav
        aria-label={ariaLabel}
        // `min-h-0` + `overflow-y-auto`: si el menú crece más que el alto disponible, hace scroll
        // dentro de la sidebar en lugar de desbordar el shell.
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4"
      >
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} />
        ))}
      </nav>
      {footer ? <div className="border-t border-subtle p-4">{footer}</div> : null}
    </div>
  );
}
