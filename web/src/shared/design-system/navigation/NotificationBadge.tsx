import { cx } from '../internal/cx';

/**
 * NotificationBadge — contador de elementos sin leer.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §14 y §20.
 *
 * - Con `count === 0` **no renderiza nada**: un cero no es información útil y añadiría ruido.
 * - Es puramente visual (`aria-hidden`): el nombre accesible con el número lo aporta el control
 *   que lo contiene (`NotificationButton`, `SidebarItem`), para que el lector de pantalla lo
 *   anuncie una sola vez.
 * - `max` evita que un contador grande rompa el layout del `TopBar`.
 */
export interface NotificationBadgeProps {
  count: number;
  /** Tope visual; por encima se muestra `{max}+`. */
  max?: number;
  className?: string;
  'data-testid'?: string;
}

export function NotificationBadge({
  count,
  max = 99,
  className,
  'data-testid': testId,
}: NotificationBadgeProps): React.JSX.Element | null {
  if (!Number.isFinite(count) || count <= 0) return null;

  const display = count > max ? `${max}+` : String(count);

  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className={cx(
        'inline-flex min-w-5 items-center justify-center rounded-badge px-1.5',
        'bg-feedback-error-strong font-ui text-caption font-semibold tabular-nums text-inverse',
        className,
      )}
    >
      {display}
    </span>
  );
}
