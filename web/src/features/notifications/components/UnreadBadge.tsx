// US-071 (PB-P2-004 / FE-003). `UnreadBadge` — encapsula el formato `9+` cuando el
// contador excede 9. Accesible: `aria-label` localizado por el consumidor.
import type { ReactElement } from 'react';

export interface UnreadBadgeProps {
  count: number;
  /** aria-label localizado (por ejemplo "5 notificaciones no leídas"). */
  ariaLabel: string;
}

export function formatUnreadCount(count: number): string {
  if (count <= 0) return '';
  if (count > 9) return '9+';
  return String(count);
}

export function UnreadBadge({ count, ariaLabel }: UnreadBadgeProps): ReactElement | null {
  if (count <= 0) return null;
  return (
    <span
      aria-label={ariaLabel}
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold leading-5 text-white"
      data-testid="us071-unread-badge"
    >
      {formatUnreadCount(count)}
    </span>
  );
}
