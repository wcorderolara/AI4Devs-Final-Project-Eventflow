import Link from 'next/link';
import { Badge } from '../feedback/Badge';
import { cx } from '../internal/cx';
import type { NavigationItem } from './navigationModel';

/**
 * SidebarItem — entrada de navegación estructural.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`SidebarItem`) y §37.
 *
 * - `aria-current="page"` cuando la ruta actual coincide.
 * - El estado activo **no depende sólo del color**: además de `sidebar.item.activeBackground`
 *   añade peso tipográfico y una marca vertical (UI-DEC-014 / §37 color-independence).
 * - El icono **nunca** sustituye al label visible; va `aria-hidden`.
 * - Área táctil ≥ 44 px (`min-h-touch`) tanto en desktop como en el drawer.
 * - `disabled` renderiza un `<span aria-disabled>` — no un link roto — y sólo debe usarse ante
 *   una incapacidad técnica real, nunca para comunicar falta de permisos.
 * - Se conserva el prefetch por defecto de `next/link` salvo que el consumidor lo desactive.
 */
export interface SidebarItemProps {
  item: NavigationItem;
  /**
   * Se dispara al activar el enlace. Lo usa el drawer mobile para cerrarse al navegar.
   * Va sobre el propio `<a>` —no sobre un contenedor— para que `Enter` lo dispare igual que el
   * clic sin añadir handlers a elementos no interactivos.
   */
  onNavigate?: () => void;
  className?: string;
}

// `rounded-card` (12 px) reproduce la píldora del screen Stitch del layout principal; la
// transición cubre también el color de fondo del relleno activo.
const BASE =
  'group flex min-h-touch w-full items-center gap-3 rounded-card px-3 py-2 ' +
  'font-ui text-body-sm transition-colors duration-fast ease-standard';

export function SidebarItem({ item, onNavigate, className }: SidebarItemProps): React.JSX.Element {
  const { href, label, icon, active = false, badge, disabled = false, prefetch } = item;

  const content = (
    <>
      {/* Segunda señal del estado activo, además del fondo: barra vertical de acento. Sobre el
          relleno violeta se invierte a `sidebar.item.activeForeground` para seguir siendo
          visible (antes era violeta sobre un fondo violeta claro). */}
      <span
        aria-hidden="true"
        className={cx(
          'h-5 w-0.5 shrink-0 rounded-badge',
          active ? 'bg-sidebar-item-active-foreground' : 'bg-transparent',
        )}
      />
      {/* El selector de hijo normaliza el tamaño del glifo Lucide a `icon.size.sm` sin obligar
          al consumidor a recordar las clases. */}
      <span aria-hidden="true" className="inline-flex shrink-0 [&>svg]:h-icon-sm [&>svg]:w-icon-sm">
        {icon}
      </span>
      <span className="min-w-0 flex-1 break-words text-left">{label}</span>
      {badge && badge.count > 0 ? (
        <>
          {/* El nombre accesible del ítem se compone «label + descripción del contador»; este
              espacio, nodo de texto directo del enlace, evita que ambos se peguen al calcular el
              accessible name. `srLabel` del `Badge` aporta la descripción y silencia el dígito,
              que aislado no significa nada (PB-P2-030). */}{' '}
          <Badge variant="count" srLabel={badge.label} className="shrink-0 tabular-nums">
            {badge.count}
          </Badge>
        </>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        data-active={active || undefined}
        className={cx(BASE, 'cursor-not-allowed text-disabled', className)}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
      className={cx(
        'focus-ring',
        BASE,
        active
          ? 'bg-sidebar-item-active font-semibold text-sidebar-item-active shadow-surface-subtle'
          : 'text-secondary hover:bg-sidebar-item-hover hover:text-primary',
        className,
      )}
    >
      {content}
    </Link>
  );
}
