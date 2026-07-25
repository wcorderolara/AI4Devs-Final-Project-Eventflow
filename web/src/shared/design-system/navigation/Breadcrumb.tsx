import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cx } from '../internal/cx';

/**
 * Breadcrumb — ruta jerárquica hacia la vista actual.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`Breadcrumb`) y
 * `docs/ux-ui/EventFlow-UI-Foundations.md` §15.
 *
 * - **No se monta en cada página**: sólo cuando la jerarquía aporta comprensión (p. ej.
 *   `Directorio › Proveedor › Portafolio`). Esa decisión pertenece a la vista.
 * - `<nav>` con nombre accesible + `<ol>`; el último ítem lleva `aria-current="page"` y no es link.
 * - En mobile los ítems intermedios se truncan con `title` como respaldo; el ítem actual nunca
 *   se trunca, para no perder el contexto de dónde está el usuario.
 */
export interface BreadcrumbItem {
  label: string;
  /** Ausente en el último ítem (página actual). */
  href?: string;
}

export interface BreadcrumbProps {
  /** Nombre accesible del landmark, ya traducido (p. ej. `Ruta de navegación`). */
  ariaLabel: string;
  items: readonly BreadcrumbItem[];
  className?: string;
  'data-testid'?: string;
}

export function Breadcrumb({
  ariaLabel,
  items,
  className,
  'data-testid': testId,
}: BreadcrumbProps): React.JSX.Element | null {
  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} data-testid={testId} className={cx('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-1 font-body text-body-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.href ?? 'current'}-${item.label}`}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="h-icon-sm w-icon-sm shrink-0 text-muted"
                />
              ) : null}
              {isLast || !item.href ? (
                <span aria-current="page" className="min-w-0 font-medium text-primary">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  title={item.label}
                  className="focus-ring max-w-32 truncate rounded-sm text-secondary hover:text-link-hover hover:underline sm:max-w-none"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
