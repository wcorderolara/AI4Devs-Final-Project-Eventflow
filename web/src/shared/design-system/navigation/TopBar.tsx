import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * TopBar — barra superior del área autenticada.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`TopBar`,
 * `layout.header.height`) y `docs/ux-ui/EventFlow-UI-Foundations.md` §14.2 (borde ligero visible,
 * sin sombras decorativas en superficies operativas).
 *
 * Composición pura: recibe slots y no decide qué acciones existen. En particular **no** añade
 * búsqueda global — el screen Stitch la muestra, pero no hay requisito de producto que la
 * respalde, así que no se propaga.
 *
 * Altura `h-header` (64 px, `layout.header.height`). Un único borde inferior como separador.
 */
export interface TopBarProps {
  /** Trigger del drawer mobile (`MobileNavigationTrigger`). Se oculta solo en desktop. */
  menuTrigger?: ReactNode;
  /** Identidad de EventFlow (logo / wordmark). */
  brand?: ReactNode;
  /** Título contextual de la página. Alternativa o complemento del breadcrumb. */
  title?: ReactNode;
  /** `Breadcrumb` cuando la jerarquía aporta contexto. */
  breadcrumb?: ReactNode;
  /** Acciones a la derecha: notificaciones, idioma, menú de usuario. */
  actions?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function TopBar({
  menuTrigger,
  brand,
  title,
  breadcrumb,
  actions,
  className,
  'data-testid': testId,
}: TopBarProps): React.JSX.Element {
  return (
    <header
      data-testid={testId}
      className={cx(
        'flex h-header shrink-0 items-center justify-between gap-3 border-b border-subtle bg-surface px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {menuTrigger}
        {brand}
        {title || breadcrumb ? (
          <div className="hidden min-w-0 flex-col justify-center md:flex">
            {breadcrumb}
            {title ? (
              <span className="truncate font-heading text-body-md font-semibold text-primary">
                {title}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1 sm:gap-2">{actions}</div> : null}
    </header>
  );
}
