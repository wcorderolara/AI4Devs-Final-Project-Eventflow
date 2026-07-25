import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileText,
  Info,
  Slash,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../internal/cx';

/**
 * StatusBadge — estado de una entidad de EventFlow.
 *
 * Fuente normativa: `docs/ux-ui/EventFlow-Component-Foundations.md` §14 (tabla de mapeo estado →
 * tokens) y §37 (color-independence).
 *
 * - **El texto visible es obligatorio** (`children`); el color nunca es la única señal.
 * - El icono es opcional pero, cuando aparece, es **consistente por tono** en toda la aplicación.
 * - Los estados de dominio (`draft`, `active`, `completed`, `cancelled`) se aceptan por
 *   conveniencia porque el documento los nombra explícitamente; cualquier otro vocabulario de
 *   dominio (quote, vendor, review…) se traduce a un **tono** en el feature, no aquí
 *   (`STATUS_BADGE_TONE` está exportado para ese mapeo).
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
export type StatusBadgeStatus = StatusTone | 'draft' | 'active' | 'completed' | 'cancelled';

/** Mapeo estado de dominio → tono semántico (Component Foundations §14). */
export const STATUS_BADGE_TONE: Record<StatusBadgeStatus, StatusTone> = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  draft: 'neutral',
  completed: 'neutral',
  active: 'success',
  cancelled: 'error',
};

export interface StatusBadgeProps {
  status: StatusBadgeStatus;
  /** Texto visible ya traducido. Obligatorio: el estado nunca se comunica sólo con color. */
  children: ReactNode;
  /** `false` oculta el glifo; el texto sigue siendo la señal primaria. */
  showIcon?: boolean;
  /** Sustituye el glifo por defecto del tono (mismo tamaño, sigue `aria-hidden`). */
  icon?: ReactNode;
  /**
   * `role="status"` + nombre accesible. Sólo cuando el badge cambia en vivo tras una acción del
   * usuario; en listados estáticos se omite para no saturar al lector de pantalla.
   */
  ariaLabel?: string;
  className?: string;
  'data-testid'?: string;
  'data-status'?: string;
}

const TONE: Record<StatusTone, string> = {
  neutral: 'border-subtle bg-surface-subtle text-secondary',
  info: 'border-feedback-info bg-feedback-info text-feedback-info',
  success: 'border-feedback-success bg-feedback-success text-feedback-success',
  warning: 'border-feedback-warning bg-feedback-warning text-feedback-warning',
  error: 'border-feedback-error bg-feedback-error text-feedback-error',
};

/** Un glifo por tono, estable en toda la aplicación (Component Foundations §34). */
const TONE_ICON: Record<StatusTone, ReactNode> = {
  neutral: <CircleDot aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  info: <Info aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  success: <CheckCircle2 aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  warning: <AlertTriangle aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  error: <XCircle aria-hidden="true" className="h-icon-sm w-icon-sm" />,
};

/** Glifos específicos de los estados de dominio con tono neutro, para distinguirlos entre sí. */
const DOMAIN_ICON: Partial<Record<StatusBadgeStatus, ReactNode>> = {
  draft: <FileText aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  completed: <CheckCircle2 aria-hidden="true" className="h-icon-sm w-icon-sm" />,
  cancelled: <Slash aria-hidden="true" className="h-icon-sm w-icon-sm" />,
};

export function StatusBadge({
  status,
  children,
  showIcon = true,
  icon,
  ariaLabel,
  className,
  'data-testid': testId,
  'data-status': dataStatus,
}: StatusBadgeProps): React.JSX.Element {
  const tone = STATUS_BADGE_TONE[status];
  const glyph = icon ?? DOMAIN_ICON[status] ?? TONE_ICON[tone];

  return (
    <span
      role={ariaLabel ? 'status' : undefined}
      aria-label={ariaLabel}
      data-testid={testId}
      data-status={dataStatus ?? status}
      className={cx(
        'inline-flex max-w-full items-center gap-1 rounded-badge border px-2.5 py-0.5',
        'font-ui text-caption font-medium',
        TONE[tone],
        className,
      )}
    >
      {showIcon ? <span className="inline-flex shrink-0">{glyph}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}
