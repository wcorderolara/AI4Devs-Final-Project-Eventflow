import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * AppShell — layout del área autenticada.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-UI-Foundations.md` §8 y §15 (UI-DEC-008: un único shell
 * compartido por `organizer`, `vendor` y `admin`) y
 * `docs/ux-ui/EventFlow-Component-Foundations.md` §20.
 *
 * Responsabilidad **exclusivamente de composición**: skip link → topbar → (sidebar | contenido) +
 * drawer mobile. No hace fetching, no comprueba sesión, no evalúa permisos y no conoce rutas;
 * todo eso permanece en los layouts del App Router y en los guards existentes.
 *
 * Tampoco existen temas por rol (UI-DEC-009): los tres roles montan este mismo shell y sólo
 * cambian el modelo de navegación y el contenido.
 *
 * El padding y el fondo del área de contenido llegan por `mainClassName`: cada route group
 * conserva exactamente la densidad que ya tenía, de modo que adoptar el shell no altera el
 * render de las vistas existentes.
 */
export interface AppShellProps {
  /** Skip-to-content. Debe ser el primer elemento focusable del documento. */
  skipLink?: ReactNode;
  /** `TopBar` ya compuesta por el consumidor. */
  topBar: ReactNode;
  /** `AppSidebar` (desktop). Ausente ⇒ shell de una sola columna. */
  sidebar?: ReactNode;
  /** `MobileNavigationDrawer`. Vive fuera del flujo; se monta junto al shell. */
  drawer?: ReactNode;
  children: ReactNode;
  /** `id` del landmark principal; debe coincidir con el destino del skip link. */
  mainId?: string;
  /** Clases del `<main>` (padding, fondo, display). */
  mainClassName?: string;
  className?: string;
}

export function AppShell({
  skipLink,
  topBar,
  sidebar,
  drawer,
  children,
  mainId = 'main-content',
  mainClassName,
  className,
}: AppShellProps): React.JSX.Element {
  return (
    // `overflow-x-clip` garantiza que ningún elemento del shell provoque scroll horizontal de
    // página (WCAG 1.4.10 reflow); el scroll horizontal permitido vive dentro de las tablas.
    <div className={cx('flex min-h-screen flex-col overflow-x-clip', className)}>
      {skipLink}
      {topBar}
      {drawer}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <main id={mainId} className={cx('min-w-0 flex-1', mainClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
