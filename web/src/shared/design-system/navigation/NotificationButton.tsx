'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '../feedback/Spinner';
import { cx } from '../internal/cx';
import { NotificationBadge } from './NotificationBadge';

/**
 * NotificationButton — acceso a notificaciones desde el `TopBar`.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §20 (`TopBar`) y §11
 * (`IconButton`: nombre accesible obligatorio, ≥ 44 × 44 px).
 *
 * - `label` es el **nombre accesible completo** ya traducido e interpolado por el consumidor
 *   (p. ej. `Notificaciones, 3 sin leer`): así el contador se anuncia una sola vez y el plural
 *   lo resuelve `next-intl`, no el design system.
 * - Con `href` se comporta como navegación (`<a>`); con `onClick`, como acción (`<button>`).
 *   Nunca ambas cosas — Component Foundations §12.
 * - No implementa tiempo real ni push: sólo presenta el contador que recibe.
 */
export interface NotificationButtonProps {
  /** Nombre accesible completo, ya traducido. */
  label: string;
  /** Número sin leer. `0` o ausente ⇒ sin contador visible. */
  count?: number;
  /** Destino existente de notificaciones. Excluyente con `onClick`. */
  href?: string;
  /** Abre un panel. Excluyente con `href`. */
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
  'data-testid'?: string;
}

const BASE =
  'focus-ring relative inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center ' +
  'rounded-button text-secondary transition-colors duration-fast ease-standard hover:bg-action-ghost-hover';

export function NotificationButton({
  label,
  count = 0,
  href,
  onClick,
  isLoading = false,
  className,
  'data-testid': testId,
}: NotificationButtonProps): React.JSX.Element {
  const inner = (
    <>
      {isLoading ? (
        <Spinner size="md" inline />
      ) : (
        <Bell aria-hidden="true" className="h-icon-md w-icon-md" />
      )}
      {!isLoading && count > 0 ? (
        <NotificationBadge count={count} className="absolute right-1.5 top-1.5" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        data-testid={testId}
        aria-busy={isLoading || undefined}
        className={cx(BASE, className)}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      aria-busy={isLoading || undefined}
      className={cx(BASE, className)}
    >
      {inner}
    </button>
  );
}
